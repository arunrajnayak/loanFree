import XLSX from "xlsx";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import {
  loans,
  disbursements,
  payments,
  interestRecords,
  predictionScenarios,
} from "../lib/schema";

const DB_PATH = path.join(process.cwd(), "loanfree.db");
const EXCEL_PATH = path.join(process.cwd(), "Park East Payments.xlsx");

function excelDateToISO(serial: number): string {
  const epoch = new Date(1899, 11, 30);
  const d = new Date(epoch.getTime() + serial * 86400000);
  return d.toISOString().split("T")[0];
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "number") return excelDateToISO(val);
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return null;
}

function toMonth(dateStr: string): string {
  return dateStr.substring(0, 7); // "2024-03-01" -> "2024-03"
}

function main() {
  console.log("Reading Excel file:", EXCEL_PATH);
  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });

  // Set up database
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);

  // Run migrations
  console.log("Running migrations...");
  migrate(db, { migrationsFolder: "./drizzle" });

  // Clear existing data
  sqlite.exec("DELETE FROM prediction_scenarios");
  sqlite.exec("DELETE FROM interest_records");
  sqlite.exec("DELETE FROM payments");
  sqlite.exec("DELETE FROM disbursements");
  sqlite.exec("DELETE FROM loans");

  // Insert Park East loan
  console.log("Creating Park East loan...");
  db.insert(loans)
    .values({
      name: "Park East",
      loanType: "home",
      sanctionedAmount: 11000000,
      interestRate: 7.1,
      tenureYears: 25,
      emi: 87500,
      startDate: "2024-03-01",
      status: "active",
    })
    .run();

  const { id: insertedId } = sqlite.prepare("SELECT last_insert_rowid() as id").get() as { id: number };
  const LOAN_ID = insertedId;
  console.log(`Loan created with ID: ${LOAN_ID}`);

  // Parse Payments sheet
  const paymentsSheet = wb.Sheets["Payments"];
  const data: unknown[][] = XLSX.utils.sheet_to_json(paymentsSheet, {
    header: 1,
    defval: null,
  });

  // Zone 1: Builder payments (cols A-B, index 0-1)
  console.log("Importing builder payments...");
  let builderCount = 0;
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const date = parseDate(row[0]);
    const amount = row[1] as number;
    if (date && amount && typeof amount === "number") {
      db.insert(payments).values({
        loanId: LOAN_ID,
        date,
        amount,
        type: "builder",
        notes: "Builder payment",
      }).run();
      builderCount++;
    }
  }
  console.log(`  ${builderCount} builder payments imported`);

  // Zone 2: Bank disbursements (cols E-F, index 4-5)
  console.log("Importing disbursements...");
  let disbCount = 0;
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const date = parseDate(row[4]);
    const amount = row[5] as number;
    if (date && amount && typeof amount === "number") {
      db.insert(disbursements).values({
        loanId: LOAN_ID,
        date,
        amount,
        description: `Disbursement #${disbCount + 1}`,
      }).run();
      disbCount++;
    }
  }
  console.log(`  ${disbCount} disbursements imported`);

  // Zone 3: Repayments to bank (cols H-I, index 7-8)
  console.log("Importing bank repayments...");
  let repayCount = 0;
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const date = parseDate(row[7]);
    const amount = row[8] as number;
    if (date && amount && typeof amount === "number") {
      // Determine type: 87500 = EMI, 12500 = prepayment, others = prepayment
      const type = amount === 87500 ? "emi" : "prepayment";
      db.insert(payments).values({
        loanId: LOAN_ID,
        date,
        amount,
        type,
        notes: type === "emi" ? "Monthly EMI" : "Monthly prepayment",
      }).run();
      repayCount++;
    }
  }
  console.log(`  ${repayCount} bank repayments imported`);

  // Zone 4: Interest records (cols K-L, index 10-11)
  console.log("Importing interest records...");
  let interestCount = 0;
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const date = parseDate(row[10]);
    const amount = row[11] as number;
    if (date && amount && typeof amount === "number") {
      const month = toMonth(date);
      db.insert(interestRecords).values({
        loanId: LOAN_ID,
        month,
        amount,
      }).run();
      interestCount++;
    }
  }
  console.log(`  ${interestCount} interest records imported`);

  // Parse Calculator sheet for amortization data to fill principal/interest components
  console.log("Processing calculator data...");
  const calcSheet = wb.Sheets["Calculator"];
  const calcData: unknown[][] = XLSX.utils.sheet_to_json(calcSheet, {
    header: 1,
    defval: null,
  });

  // Row 19 is header: Month, Paid/EMI, Towards Loan, Towards Interest, Outstanding Loan, Prepayment?
  // Rows 20+ are data
  let calcCount = 0;
  for (let i = 20; i < calcData.length; i++) {
    const row = calcData[i];
    const date = parseDate(row[0]);
    const emi = row[1] as number;
    const towardsLoan = row[2] as number;
    const towardsInterest = row[3] as number;
    const outstanding = row[4] as number;

    if (date && emi && emi > 0) {
      const month = toMonth(date);
      // Update interest records with outstanding balance
      sqlite.prepare(
        "UPDATE interest_records SET outstanding_balance = ? WHERE loan_id = ? AND month = ?"
      ).run(outstanding, LOAN_ID, month);
      calcCount++;
    }
  }
  console.log(`  ${calcCount} amortization rows processed`);

  // Create default prediction scenario matching Excel config
  console.log("Creating default prediction scenario...");
  db.insert(predictionScenarios).values({
    loanId: LOAN_ID,
    name: "Current Strategy (from Excel)",
    extraMonthly: 12500,
    extraEmiPerYear: 0,
    annualHikePct: 5,
    isDefault: true,
  }).run();

  // Summary
  console.log("\n--- Import Summary ---");
  console.log(`Loan: Park East (₹1.1 Cr @ 7.1%, 25 years)`);
  console.log(`Builder payments: ${builderCount}`);
  console.log(`Disbursements: ${disbCount}`);
  console.log(`Bank repayments: ${repayCount}`);
  console.log(`Interest records: ${interestCount}`);
  console.log(`Default prediction scenario created`);
  console.log("Seed complete!");

  sqlite.close();
}

main();
