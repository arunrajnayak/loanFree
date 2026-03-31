import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const loans = sqliteTable("loans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  loanType: text("loan_type", { enum: ["home", "personal"] })
    .notNull()
    .default("home"),
  sanctionedAmount: real("sanctioned_amount").notNull(),
  interestRate: real("interest_rate").notNull(),
  tenureYears: integer("tenure_years").notNull(),
  emi: real("emi").notNull(),
  startDate: text("start_date").notNull(),
  status: text("status", { enum: ["active", "closed"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const disbursements = sqliteTable("disbursements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  type: text("type", {
    enum: ["emi", "prepayment", "builder"],
  }).notNull(),
  principalComponent: real("principal_component"),
  interestComponent: real("interest_component"),
  notes: text("notes"),
});

export const interestRecords = sqliteTable("interest_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id),
  month: text("month").notNull(), // "2024-03"
  amount: real("amount").notNull(),
  outstandingBalance: real("outstanding_balance"),
});

export const predictionScenarios = sqliteTable("prediction_scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id),
  name: text("name").notNull(),
  extraMonthly: real("extra_monthly").notNull().default(0),
  extraEmiPerYear: integer("extra_emi_per_year").notNull().default(0),
  annualHikePct: real("annual_hike_pct").notNull().default(0),
  lumpSumAmount: real("lump_sum_amount").default(0),
  lumpSumMonth: text("lump_sum_month"),
  isDefault: integer("is_default", { mode: "boolean" })
    .notNull()
    .default(false),
});

export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;
export type Disbursement = typeof disbursements.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type InterestRecord = typeof interestRecords.$inferSelect;
export type PredictionScenario = typeof predictionScenarios.$inferSelect;
