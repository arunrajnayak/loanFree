# LoanFree -- Implementation Plan

## Overview

LoanFree is a greenfield Next.js web application for tracking home loans, payments, disbursements, amortization schedules, and prepayment prediction scenarios. It replaces the existing Excel-based tracking (`Park East Payments.xlsx`) with a multi-loan, interactive, chart-rich web interface.

---

## Excel Data Analysis (Seed Source)

The Excel file contains 4 sheets. Here is the exact structure that the seed script must parse:

### Sheet: "Payments" (Columns A-O)
- **Cols A-B**: Builder payments (11 entries, A3:B12). Date + Amount. Total in B2 = 4,939,610.
- **Cols E-F**: Bank disbursements (4 entries, E3:E6). Date + Amount. Total in F2 = 7,252,890.
- **Cols H-I**: Bank repayments -- EMI of 87,500 + prepayment of 12,500 monthly (H3:I51). Total in I2 = 2,637,500.
- **Cols K-L**: Interest charged monthly by bank (K3:L27, Feb 2024 -- Feb 2026). Total in L2 = 848,628.
- **Cols N-O**: Summary (N3:O8): Disbursed, Interest, Repayed, Balance, Principal paid, Total Payment.

### Sheet: "Calculator" (Columns A-F)
- **Rows 1-8**: Loan config: Amount=1,10,00,000; Rate=7.1%; Tenure=25yr; EMI=78,448.84 (calculated). With prepay: Interest=33,24,168; Total=1,43,24,168; Loan paid in 8.4 years.
- **Rows 10-12**: Prepayment config: Extra EMIs/year=0; Hike EMI by 5%/year.
- **Rows 20-122**: Amortization table (Month, Paid/EMI, Towards Loan, Towards Interest, Outstanding Loan, Prepayment).
  - Rows 21-44 (Mar 2024 -- Feb 2026): Interest values are hardcoded (actual bank-reported figures).
  - Rows 45+: Interest calculated as `Outstanding * Rate / 12`.
  - EMI hikes by 5% every 12 months (rows 45, 57, 69, 81, 93, 105, 117).
  - Prepayment column: 12,500/month for first ~34 months, then 47,500/month once extra EMIs kick in.
  - Outstanding formula: `Previous_Outstanding - Principal_Paid - Prepayment` (uses a +10 row offset quirk in Excel).
  - Loan fully paid by Aug 2032 (row 122, outstanding goes to 0).

### Sheet: "Rashmitha" (Columns A-B)
- Simple Date + Amount table (33 entries, A3:B36). Total in B2 = 23,82,500.
- This represents payments to another person (not a bank loan, just builder/personal payments).

### Sheet: "Graph"
- Empty (placeholder for chart).

---

## Phase 1: Project Scaffolding, Database, and Seed Script

### Step 1.1 -- Initialize Next.js Project

Run the following from `/Users/arunrajnayak/Work/Hobby/loanFree/`:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

This creates the App Router project structure. Then install dependencies:

```bash
npm install better-sqlite3 drizzle-orm
npm install -D drizzle-kit @types/better-sqlite3
npm install xlsx                    # for Excel parsing in seed script
npm install recharts                # charts
npm install date-fns                # date utilities
npm install lucide-react            # icons
npx shadcn@latest init              # interactive: select default theme, CSS variables, etc.
npx shadcn@latest add button card input label select table tabs separator badge dialog sheet slider toast dropdown-menu popover calendar command form scroll-area
```

### Step 1.2 -- Database Schema

**File: `lib/db.ts`**

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'loanfree.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}
```

**File: `lib/schema.ts`** -- Drizzle ORM schema definitions.

Tables:

1. **`loans`**
   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `name` TEXT NOT NULL (e.g., "Park East", "Rashmitha")
   - `property_name` TEXT (nullable, e.g., "Park East")
   - `loan_amount` REAL NOT NULL (sanctioned amount, e.g., 11000000)
   - `interest_rate` REAL NOT NULL (annual, e.g., 0.071)
   - `tenure_months` INTEGER NOT NULL (e.g., 300)
   - `emi_amount` REAL NOT NULL (calculated or user-provided, e.g., 87500)
   - `start_date` TEXT NOT NULL (ISO date string)
   - `status` TEXT NOT NULL DEFAULT 'active' (active | closed)
   - `loan_type` TEXT NOT NULL DEFAULT 'home_loan' (home_loan | personal)
   - `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   - `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

2. **`disbursements`**
   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `loan_id` INTEGER NOT NULL REFERENCES loans(id)
   - `date` TEXT NOT NULL
   - `amount` REAL NOT NULL
   - `description` TEXT
   - `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

3. **`payments`**
   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `loan_id` INTEGER NOT NULL REFERENCES loans(id)
   - `date` TEXT NOT NULL
   - `amount` REAL NOT NULL
   - `type` TEXT NOT NULL (emi | prepayment | builder | personal)
   - `principal_component` REAL (nullable, filled from amortization)
   - `interest_component` REAL (nullable, filled from amortization)
   - `notes` TEXT
   - `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

4. **`interest_records`**
   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `loan_id` INTEGER NOT NULL REFERENCES loans(id)
   - `date` TEXT NOT NULL (end-of-month date)
   - `amount` REAL NOT NULL
   - `source` TEXT NOT NULL DEFAULT 'bank_statement' (bank_statement | calculated)
   - `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

5. **`amortization_entries`**
   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `loan_id` INTEGER NOT NULL REFERENCES loans(id)
   - `month` TEXT NOT NULL (ISO date, 1st of month)
   - `emi_paid` REAL NOT NULL
   - `principal` REAL NOT NULL
   - `interest` REAL NOT NULL
   - `outstanding_balance` REAL NOT NULL
   - `prepayment` REAL NOT NULL DEFAULT 0
   - `is_actual` INTEGER NOT NULL DEFAULT 0 (boolean: 1 = from real data, 0 = projected)
   - `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   - UNIQUE(loan_id, month)

6. **`prediction_scenarios`**
   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `loan_id` INTEGER NOT NULL REFERENCES loans(id)
   - `name` TEXT NOT NULL
   - `extra_monthly_payment` REAL NOT NULL DEFAULT 0
   - `extra_yearly_lump_sum` REAL NOT NULL DEFAULT 0
   - `extra_emi_per_year` INTEGER NOT NULL DEFAULT 0
   - `annual_emi_hike_pct` REAL NOT NULL DEFAULT 0
   - `lump_sum_month` INTEGER NOT NULL DEFAULT 1 (which month of year for lump sum)
   - `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   - `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

**File: `lib/migrate.ts`** -- Creates all tables using raw SQL (or Drizzle `migrate()`).

### Step 1.3 -- Seed Script

**File: `scripts/seed.ts`**

This script:
1. Reads `Park East Payments.xlsx` using the `xlsx` library.
2. Creates the `data/` directory if it doesn't exist.
3. Runs migrations (creates tables).
4. Inserts seed data:

**Loan 1: "Park East"**
- `loan_amount`: 11000000, `interest_rate`: 0.071, `tenure_months`: 300, `emi_amount`: 87500, `start_date`: "2024-03-01", `loan_type`: "home_loan"
- Disbursements from Payments sheet cols E-F (4 rows: Feb 2024 3,630,120; Apr 2024 605,000; Aug 2024 1,815,000; Jan 2025 1,202,770).
- Builder payments from cols A-B (11 rows, type = "builder").
- Bank repayments from cols H-I: each 87,500 entry is type "emi", each 12,500 entry is type "prepayment". Pattern: dates on 1st/2nd of month = prepayment (12,500), dates on 5th = EMI (87,500). Special: Jun 2024 has a 150,000 entry (extra prepayment).
- Interest records from cols K-L (27 monthly entries).
- Amortization entries from Calculator sheet rows 21-122: rows 21-44 are `is_actual = 1`, rows 45+ are `is_actual = 0`.

**Loan 2: "Rashmitha"**
- `loan_amount`: 2382500 (total), `interest_rate`: 0, `tenure_months`: 0, `emi_amount`: 0, `start_date`: "2023-10-02", `loan_type`: "personal"
- Payments from Rashmitha sheet (33 entries, all type = "personal").
- No disbursements, no interest, no amortization.

**Default prediction scenario for Park East:**
- Name: "Current Strategy", `extra_monthly_payment`: 12500, `extra_emi_per_year`: 0, `annual_emi_hike_pct`: 0.05.

**Run command:**
```bash
npx tsx scripts/seed.ts
```

### Step 1.4 -- Core Utility Library

**File: `lib/calculations.ts`**

This is the mathematical engine. Functions:

```typescript
// Standard EMI formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
export function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number;

// Generate amortization schedule from current state
export function generateAmortizationSchedule(params: {
  outstandingBalance: number;
  annualRate: number;
  emiAmount: number;
  startMonth: Date;           // first projected month
  prepaymentPerMonth: number;
  annualEmiHikePct: number;
  extraEmiPerYear: number;
  extraYearlyLumpSum: number;
  lumpSumMonth: number;       // 1-12, which month gets the lump sum
}): AmortizationEntry[];

// Compare two amortization schedules
export function compareScenarios(
  baseline: AmortizationEntry[],
  scenario: AmortizationEntry[]
): ScenarioComparison;

// Calculate summary stats from payments + interest data
export function calculateLoanSummary(params: {
  totalDisbursed: number;
  payments: { amount: number; type: string }[];
  interestRecords: { amount: number }[];
}): LoanSummary;
```

**Key calculation logic (from Excel analysis):**

For each month in the amortization:
1. `interest = outstanding_balance * annual_rate / 12`
2. `principal = emi - interest`
3. `new_outstanding = outstanding_balance - principal - prepayment`
4. EMI hike: every 12 months, multiply EMI by `(1 + hike_pct)`
5. Extra EMI per year: distribute as additional prepayments
6. If outstanding <= EMI, pay remaining and terminate
7. Negative outstanding means loan is paid off

**File: `lib/utils.ts`**

```typescript
export function formatINR(amount: number): string;     // "₹49,39,610"  Indian numbering
export function formatDate(date: string): string;       // "02 Oct 2023"
export function formatPercent(rate: number): string;    // "7.1%"
export function monthsBetween(start: Date, end: Date): number;
export function addMonths(date: Date, months: number): Date;
```

**File: `lib/types.ts`**

```typescript
export interface Loan { ... }
export interface Payment { ... }
export interface Disbursement { ... }
export interface InterestRecord { ... }
export interface AmortizationEntry {
  month: string;
  emiPaid: number;
  principal: number;
  interest: number;
  outstandingBalance: number;
  prepayment: number;
  isActual: boolean;
}
export interface PredictionScenario { ... }
export interface ScenarioComparison {
  baselinePayoffDate: Date;
  scenarioPayoffDate: Date;
  monthsSaved: number;
  interestSaved: number;
  baselineTotalInterest: number;
  scenarioTotalInterest: number;
  baselineTotalPaid: number;
  scenarioTotalPaid: number;
}
export interface LoanSummary {
  totalDisbursed: number;
  totalPaidToBank: number;
  totalPaidToBuilder: number;
  totalInterestPaid: number;
  principalRepaid: number;
  outstandingBalance: number;
  emiAmount: number;
  interestRate: number;
  tenureRemaining: number;
}
```

---

## Phase 2: API Routes and Core Pages

### Step 2.1 -- API Route Structure

All API routes live under `app/api/` and return JSON. Use `better-sqlite3` directly (synchronous, no need for async wrappers with SQLite).

**File: `app/api/loans/route.ts`** -- GET (list all loans), POST (create loan)
**File: `app/api/loans/[id]/route.ts`** -- GET (single loan + summary stats), PUT (update), DELETE
**File: `app/api/loans/[id]/summary/route.ts`** -- GET (computed summary: aggregates from payments, disbursements, interest)
**File: `app/api/payments/route.ts`** -- GET (all, with ?loan_id filter), POST (create)
**File: `app/api/payments/[id]/route.ts`** -- GET, PUT, DELETE
**File: `app/api/disbursements/route.ts`** -- GET (?loan_id), POST
**File: `app/api/disbursements/[id]/route.ts`** -- GET, PUT, DELETE
**File: `app/api/interest/route.ts`** -- GET (?loan_id), POST
**File: `app/api/amortization/route.ts`** -- GET (?loan_id, returns stored + projected)
**File: `app/api/predict/route.ts`** -- POST (accepts scenario params, returns computed amortization)
**File: `app/api/scenarios/route.ts`** -- GET (?loan_id), POST
**File: `app/api/scenarios/[id]/route.ts`** -- GET, PUT, DELETE

Each route handler pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const db = getDb();
  const loans = db.prepare('SELECT * FROM loans ORDER BY created_at DESC').all();
  return NextResponse.json(loans);
}
```

### Step 2.2 -- Root Layout with Sidebar Navigation

**File: `app/layout.tsx`**

Root layout with:
- `<Sidebar>` on the left (desktop) / bottom nav (mobile)
- Main content area with `<Header>` (breadcrumbs, loan selector dropdown)
- Wrapped in a Tailwind dark-mode–aware container

**File: `components/layout/sidebar.tsx`**

Navigation items:
- Dashboard (Home icon) -> `/`
- Loans (Building icon) -> `/loans`
- Payments (CreditCard icon) -> `/loans/[id]/payments`
- Amortization (TableProperties icon) -> `/loans/[id]/amortization`
- Predictor (TrendingDown icon) -> `/loans/[id]/predict`
- Import (Upload icon) -> `/import`

**File: `components/layout/header.tsx`**

- Loan selector dropdown (switches context to different loan)
- Breadcrumb trail
- Dark mode toggle

**File: `components/layout/loan-context.tsx`**

React context provider that stores the currently selected loan ID. Used by child pages to know which loan to display.

### Step 2.3 -- Dashboard Page

**File: `app/page.tsx`** (Server Component, fetches data then renders client components)

Layout:
```
┌──────────────────────────────────────────────────┐
│  LoanFree Dashboard                              │
├──────────┬──────────┬──────────┬────────────────┤
│Outstanding│ Disbursed│ Total    │ Interest       │
│ Balance   │          │ Repaid   │ Paid           │
│ ₹54.64L   │ ₹72.53L │ ₹26.38L │ ₹8.49L        │
├──────────┴──────────┴──────────┴────────────────┤
│ Quick Stats: EMI ₹87,500 | Rate 7.1% | ~22yr rem│
├──────────────────────┬───────────────────────────┤
│  Monthly Breakdown   │  Recent Payments          │
│  [Stacked Bar Chart] │  - 05 Mar 2026 ₹87,500   │
│  Principal/Interest  │  - 01 Mar 2026 ₹12,500   │
│                      │  - 05 Feb 2026 ₹87,500   │
├──────────────────────┼───────────────────────────┤
│  Outstanding Balance │  Loan Cards               │
│  [Line Chart]        │  [Park East] [Rashmitha]  │
└──────────────────────┴───────────────────────────┘
```

**Components:**

- **`components/dashboard/summary-cards.tsx`** -- 4-5 cards using shadcn `<Card>`. Fetches from `/api/loans/[id]/summary`.
- **`components/dashboard/quick-stats.tsx`** -- Horizontal stat bar.
- **`components/dashboard/recent-payments.tsx`** -- Last 10 payments, sorted by date desc.
- **`components/dashboard/monthly-breakdown-chart.tsx`** -- Recharts `<BarChart>` with stacked bars for principal vs interest, last 12 months.
- **`components/dashboard/balance-curve-chart.tsx`** -- Recharts `<LineChart>` showing outstanding balance over time.
- **`components/dashboard/loan-cards.tsx`** -- Cards for each loan with mini summary, links to detail.

### Step 2.4 -- Loan Management Pages

**File: `app/loans/page.tsx`** -- List all loans with summary cards.

**File: `app/loans/[id]/page.tsx`** -- Loan detail page.

Layout:
```
┌─────────────────────────────────────────────┐
│  Park East                        [Edit]    │
├─────────┬─────────┬─────────┬──────────────┤
│ Loan Amt│ Rate    │ Tenure  │ EMI          │
│ ₹1.1Cr  │ 7.1%   │ 25 yrs  │ ₹87,500     │
├─────────┴─────────┴─────────┴──────────────┤
│  Disbursement Timeline                      │
│  [Waterfall Chart: 4 disbursement stages]   │
├─────────────────────────────────────────────┤
│  Tab: Payments | Amortization | Predictor   │
└─────────────────────────────────────────────┘
```

**Components:**

- **`components/loans/loan-detail-header.tsx`** -- Loan info cards + edit dialog.
- **`components/loans/disbursement-timeline.tsx`** -- Waterfall/timeline chart of partial disbursements.
- **`components/loans/loan-form.tsx`** -- Form for creating/editing a loan (used in dialog).

### Step 2.5 -- Payment Tracker Pages

**File: `app/loans/[id]/payments/page.tsx`** -- Payment history page.

**Components:**

- **`components/payments/payment-table.tsx`** -- shadcn `<Table>` with columns: Date, Amount, Type (badge), Principal, Interest, Notes. Sortable, filterable.
- **`components/payments/payment-filters.tsx`** -- Filter by type (EMI/Prepayment/Builder), date range, amount range.
- **`components/payments/payment-form.tsx`** -- Dialog form to add new payment.
- **`components/payments/payment-summary.tsx`** -- Monthly/yearly summary cards.
- **`components/payments/payment-breakdown-chart.tsx`** -- Donut chart: EMI vs Prepayment vs Builder composition.

---

## Phase 3: Charts and Amortization

### Step 3.1 -- Chart Component Library

**File: `components/charts/chart-config.ts`** -- Shared Recharts config: colors, formatters, tooltip styles.

```typescript
export const CHART_COLORS = {
  principal: '#2563eb',    // blue-600
  interest: '#dc2626',     // red-600
  prepayment: '#16a34a',   // green-600
  outstanding: '#7c3aed',  // violet-600
  baseline: '#6b7280',     // gray-500
  scenario: '#f59e0b',     // amber-500
};

export const INR_FORMATTER = (value: number) => `₹${(value / 100000).toFixed(1)}L`;
```

**File: `components/charts/stacked-area-chart.tsx`** -- Principal vs Interest over time (for amortization page).

**File: `components/charts/line-chart.tsx`** -- Generic reusable line chart (for outstanding balance, used with dual-line for predictions).

**File: `components/charts/bar-chart.tsx`** -- Monthly/yearly payment breakdown.

**File: `components/charts/donut-chart.tsx`** -- Total payment composition (Principal, Interest, Prepayment, Builder).

**File: `components/charts/waterfall-chart.tsx`** -- Disbursement stages (custom Recharts bar chart with offset bars).

**File: `components/charts/dual-line-chart.tsx`** -- Side-by-side scenario comparison (two lines on same chart).

### Step 3.2 -- Amortization Schedule Page

**File: `app/loans/[id]/amortization/page.tsx`**

Layout:
```
┌───────────────────────────────────────────────┐
│  Amortization Schedule -- Park East           │
├───────────────────────────────────────────────┤
│  [Toggle: Table View | Chart View]            │
├───────────────────────────────────────────────┤
│  TABLE VIEW:                                  │
│  Month | EMI | Principal | Interest |         │
│        |     |           |          | Balance │
│  Mar24 | 87.5K| 47.3K   | 40.2K   | 1.095Cr │
│  Apr24 | 87.5K| 60.0K   | 27.5K   | 1.088Cr │
│  ...   |      |          |         |          │
│  [Actual rows highlighted vs Projected rows]  │
├───────────────────────────────────────────────┤
│  CHART VIEW:                                  │
│  [Stacked Area: Principal vs Interest]        │
│  [Line: Outstanding Balance]                  │
└───────────────────────────────────────────────┘
```

**Components:**

- **`components/amortization/amortization-table.tsx`** -- Full table with actual vs projected row styling. Actual rows (from bank data) get a subtle green-left-border. Projected rows are plain.
- **`components/amortization/amortization-charts.tsx`** -- Stacked area (principal/interest) + overlaid line (outstanding balance).
- **`components/amortization/amortization-summary.tsx`** -- Cards: Total Interest (actual + projected), Payoff Date, Months Remaining.

Data flow:
1. Fetch stored amortization entries (actual data from seed, rows 21-44 of Calculator sheet).
2. For projected months, compute on the server using `lib/calculations.ts` starting from the last actual month's outstanding balance.
3. Return combined array to the client.

---

## Phase 4: Predictor Page (Key Feature)

### Step 4.1 -- Prediction Calculation Engine

**File: `lib/calculations.ts`** -- extend with:

```typescript
export function generatePrediction(params: {
  currentOutstanding: number;       // from latest actual data
  annualRate: number;
  currentEmi: number;
  startMonth: Date;                 // first projected month
  // Scenario inputs:
  extraMonthlyPayment: number;      // additional per month on top of EMI
  extraYearlyLumpSum: number;       // one-time annual payment
  extraEmiPerYear: number;          // e.g., 1 = 13 EMIs/year instead of 12
  annualEmiHikePct: number;         // e.g., 0.05 = 5%
  lumpSumMonth: number;             // which month (1-12) for lump sum
}): PredictionResult {
  // Returns: amortization array, payoff date, total interest, total paid
}
```

The prediction loop:

```
let outstanding = currentOutstanding;
let emi = currentEmi;
let month = startMonth;
let yearCounter = 0;

while (outstanding > 0) {
  yearCounter++;
  
  // Annual EMI hike (every 12 months)
  if (yearCounter > 1 && yearCounter % 12 === 1) {
    emi = emi * (1 + annualEmiHikePct);
  }
  
  let interest = outstanding * annualRate / 12;
  let principal = emi - interest;
  let prepayment = extraMonthlyPayment;
  
  // Extra EMI per year (distribute in specific month or spread)
  if (extraEmiPerYear > 0 && yearCounter % 12 === 0) {
    prepayment += emi * extraEmiPerYear;
  }
  
  // Annual lump sum
  if (month.getMonth() + 1 === lumpSumMonth) {
    prepayment += extraYearlyLumpSum;
  }
  
  outstanding = outstanding - principal - prepayment;
  
  if (outstanding <= 0) {
    // Adjust final payment
    break;
  }
  
  entries.push({ month, emi, principal, interest, outstanding, prepayment });
  month = addMonths(month, 1);
}
```

### Step 4.2 -- Predictor Page

**File: `app/loans/[id]/predict/page.tsx`**

This is the KEY feature page. It needs to be highly interactive with real-time updates.

Layout:
```
┌───────────────────────────────────────────────────────┐
│  Loan Payoff Predictor -- Park East                   │
├────────────────────┬──────────────────────────────────┤
│  CONFIGURATION     │  RESULTS                         │
│                    │                                   │
│  Extra Monthly     │  ┌──────────┬──────────────────┐ │
│  Payment           │  │ Original │ With Prepayment   │ │
│  [====|===] ₹12.5K │  │ Feb 2049 │ Aug 2032         │ │
│                    │  │ 25 years │ 8.4 years         │ │
│  Annual Lump Sum   │  │ ₹1.24Cr  │ ₹33.2L interest │ │
│  [====|===] ₹0     │  │ interest │                   │ │
│                    │  │          │ Save: ₹90.7L      │ │
│  Extra EMIs/Year   │  │          │ 16.6 years less   │ │
│  [====|===] 0      │  └──────────┴──────────────────┘ │
│                    │                                   │
│  Annual EMI Hike   │  [DUAL LINE CHART]               │
│  [====|===] 5%     │  Outstanding balance curve:       │
│                    │  Gray: Original | Blue: Scenario  │
│  Lump Sum Month    │                                   │
│  [Select: January] │  [STACKED AREA CHART]            │
│                    │  P vs I breakdown over scenario   │
│  [Save Scenario]   │                                   │
│  [Compare Saved]   │  [SUMMARY TABLE]                 │
│                    │  Year-by-year totals              │
└────────────────────┴──────────────────────────────────┘
```

**Components:**

- **`components/predictor/scenario-config.tsx`** -- Configuration panel with:
  - shadcn `<Slider>` for extra monthly payment (range: 0 to 100,000, step 500)
  - shadcn `<Slider>` for annual lump sum (range: 0 to 500,000, step 10,000)
  - shadcn `<Slider>` for extra EMIs per year (range: 0 to 6, step 1)
  - shadcn `<Slider>` for annual EMI hike % (range: 0 to 20, step 0.5)
  - shadcn `<Select>` for lump sum month
  - "Save Scenario" button
  - "Reset to Current" button

- **`components/predictor/comparison-cards.tsx`** -- Side-by-side cards showing Original vs Scenario results. Key metrics:
  - Payoff date
  - Total tenure (years + months)
  - Total interest paid
  - Total amount paid
  - Interest saved (highlighted in green)
  - Time saved (highlighted in green)

- **`components/predictor/payoff-chart.tsx`** -- Dual-line Recharts chart:
  - X-axis: months/years
  - Y-axis: outstanding balance (in lakhs)
  - Line 1 (gray, dashed): baseline (no prepayment)
  - Line 2 (blue, solid): scenario
  - Shaded area between lines = savings
  - Tooltip showing both values at any month

- **`components/predictor/breakdown-chart.tsx`** -- Stacked area showing principal vs interest for the scenario.

- **`components/predictor/yearly-summary-table.tsx`** -- Table with: Year, EMI Paid, Prepayment, Total Paid, Interest, Principal, Closing Balance.

- **`components/predictor/saved-scenarios.tsx`** -- List of saved scenarios with load/delete/compare actions.

- **`components/predictor/scenario-comparison-modal.tsx`** -- Modal/sheet showing 2-3 saved scenarios side-by-side with overlaid charts.

### Step 4.3 -- API for Predictions

**File: `app/api/predict/route.ts`**

POST body:
```typescript
{
  loanId: number;
  extraMonthlyPayment: number;
  extraYearlyLumpSum: number;
  extraEmiPerYear: number;
  annualEmiHikePct: number;
  lumpSumMonth: number;
}
```

Response:
```typescript
{
  baseline: {
    amortization: AmortizationEntry[];
    payoffDate: string;
    totalInterest: number;
    totalPaid: number;
    tenureMonths: number;
  };
  scenario: {
    amortization: AmortizationEntry[];
    payoffDate: string;
    totalInterest: number;
    totalPaid: number;
    tenureMonths: number;
  };
  comparison: {
    monthsSaved: number;
    interestSaved: number;
    totalSaved: number;
  };
}
```

The API handler:
1. Fetches the loan details and latest actual amortization entry (to get current outstanding).
2. Generates baseline amortization (EMI only, no prepayment, no hike).
3. Generates scenario amortization with the provided parameters.
4. Returns both schedules plus comparison stats.

### Step 4.4 -- Real-time Interaction Pattern

The Predictor page should feel instant. Strategy:

1. On page load, fetch baseline data from the API (one call).
2. Store baseline in React state.
3. When sliders change, compute the scenario **client-side** using the same `generatePrediction` function (shared between server and client via `lib/calculations.ts`).
4. Only call the API when saving a scenario.
5. Use `useMemo` to avoid recalculating on every render -- recalculate only when slider values change.
6. Debounce slider changes by 150ms for smooth updates.

This means `lib/calculations.ts` must be isomorphic (no Node-specific imports). It is pure math -- this is naturally the case.

---

## Phase 5: Polish and Data Import

### Step 5.1 -- Data Import Page

**File: `app/import/page.tsx`**

Simple page for re-importing or importing new Excel files:
- File upload dropzone
- Preview of parsed data (tables)
- "Import" button
- Progress indicator
- Conflict resolution (merge vs replace)

### Step 5.2 -- Responsive Design

- Sidebar collapses to bottom nav on mobile (< 768px).
- Charts resize via Recharts `<ResponsiveContainer>`.
- Tables scroll horizontally on mobile.
- Predictor: config panel stacks above results on mobile.

### Step 5.3 -- Dark Mode

- Use `next-themes` package.
- Tailwind `dark:` variants.
- Chart colors switch for dark backgrounds (lighter variants).

### Step 5.4 -- Export

- PDF export of amortization table (using browser print CSS or jsPDF).
- CSV download of payment history and amortization.

---

## Complete File Tree

```
loanFree/
├── app/
│   ├── layout.tsx                        # Root layout: sidebar + header + providers
│   ├── page.tsx                          # Dashboard
│   ├── globals.css                       # Tailwind base + shadcn CSS vars
│   ├── loans/
│   │   ├── page.tsx                      # Loan list
│   │   └── [id]/
│   │       ├── page.tsx                  # Loan detail
│   │       ├── layout.tsx                # Loan sub-layout with tabs
│   │       ├── payments/
│   │       │   └── page.tsx              # Payment history
│   │       ├── amortization/
│   │       │   └── page.tsx              # Amortization schedule
│   │       └── predict/
│   │           └── page.tsx              # Predictor page
│   ├── import/
│   │   └── page.tsx                      # Data import
│   └── api/
│       ├── loans/
│       │   ├── route.ts                  # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts              # GET, PUT, DELETE single loan
│       │       └── summary/
│       │           └── route.ts          # GET computed summary
│       ├── payments/
│       │   ├── route.ts                  # GET list (with filters), POST
│       │   └── [id]/
│       │       └── route.ts              # GET, PUT, DELETE
│       ├── disbursements/
│       │   ├── route.ts                  # GET, POST
│       │   └── [id]/
│       │       └── route.ts              # GET, PUT, DELETE
│       ├── interest/
│       │   └── route.ts                  # GET, POST
│       ├── amortization/
│       │   └── route.ts                  # GET (stored + projected)
│       ├── predict/
│       │   └── route.ts                  # POST (compute prediction)
│       └── scenarios/
│           ├── route.ts                  # GET, POST
│           └── [id]/
│               └── route.ts             # GET, PUT, DELETE
├── components/
│   ├── ui/                               # shadcn generated components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── slider.tsx
│   │   ├── dialog.tsx
│   │   ├── ... (all shadcn components)
│   ├── layout/
│   │   ├── sidebar.tsx                   # Navigation sidebar
│   │   ├── header.tsx                    # Breadcrumbs + loan selector
│   │   ├── loan-context.tsx              # React context for active loan
│   │   └── mobile-nav.tsx                # Bottom nav for mobile
│   ├── dashboard/
│   │   ├── summary-cards.tsx             # 4-5 summary metric cards
│   │   ├── quick-stats.tsx               # Horizontal stat strip
│   │   ├── recent-payments.tsx           # Recent payment list
│   │   ├── monthly-breakdown-chart.tsx   # Stacked bar: P vs I
│   │   ├── balance-curve-chart.tsx       # Line: outstanding over time
│   │   └── loan-cards.tsx                # Multi-loan overview cards
│   ├── charts/
│   │   ├── chart-config.ts               # Colors, formatters, shared config
│   │   ├── stacked-area-chart.tsx        # P vs I area chart
│   │   ├── line-chart.tsx                # Generic line chart
│   │   ├── bar-chart.tsx                 # Monthly/yearly bars
│   │   ├── donut-chart.tsx               # Payment composition
│   │   ├── waterfall-chart.tsx           # Disbursement stages
│   │   └── dual-line-chart.tsx           # Scenario comparison
│   ├── loans/
│   │   ├── loan-detail-header.tsx        # Loan info + edit
│   │   ├── disbursement-timeline.tsx     # Waterfall viz
│   │   └── loan-form.tsx                 # Create/edit form
│   ├── payments/
│   │   ├── payment-table.tsx             # Full payment history table
│   │   ├── payment-filters.tsx           # Type/date/amount filters
│   │   ├── payment-form.tsx              # Add payment dialog
│   │   ├── payment-summary.tsx           # Monthly/yearly totals
│   │   └── payment-breakdown-chart.tsx   # Donut chart
│   ├── amortization/
│   │   ├── amortization-table.tsx        # Schedule table (actual vs projected)
│   │   ├── amortization-charts.tsx       # Stacked area + line
│   │   └── amortization-summary.tsx      # Summary cards
│   └── predictor/
│       ├── scenario-config.tsx           # Slider panel
│       ├── comparison-cards.tsx          # Original vs Scenario
│       ├── payoff-chart.tsx              # Dual-line outstanding
│       ├── breakdown-chart.tsx           # Stacked area for scenario
│       ├── yearly-summary-table.tsx      # Year-by-year table
│       ├── saved-scenarios.tsx           # Scenario list
│       └── scenario-comparison-modal.tsx # Multi-scenario overlay
├── lib/
│   ├── db.ts                             # SQLite connection singleton
│   ├── schema.ts                         # Drizzle ORM schema
│   ├── migrate.ts                        # Schema migration runner
│   ├── calculations.ts                   # EMI, amortization, prediction math
│   ├── types.ts                          # TypeScript interfaces
│   └── utils.ts                          # Formatters, date helpers
├── scripts/
│   └── seed.ts                           # Excel parser + DB seeder
├── data/
│   └── loanfree.db                       # SQLite database (gitignored)
├── public/
│   └── (static assets)
├── .gitignore                            # Include data/*.db
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── drizzle.config.ts
├── next.config.ts
└── Park East Payments.xlsx               # Source data (keep for re-import)
```

---

## Implementation Sequencing and Dependencies

### Dependency Graph

```
Phase 1.1 (scaffold) 
  -> Phase 1.2 (schema) 
    -> Phase 1.3 (seed) [depends on schema + xlsx parsing]
    -> Phase 1.4 (calculations lib) [no DB dependency]
  -> Phase 2.1 (API routes) [depends on schema]
    -> Phase 2.2 (layout) [no API dependency, can parallel]
    -> Phase 2.3 (dashboard) [depends on API + layout]
    -> Phase 2.4 (loan pages) [depends on API + layout]
    -> Phase 2.5 (payment pages) [depends on API + layout]
  -> Phase 3.1 (chart library) [depends on recharts install only]
    -> Phase 3.2 (amortization page) [depends on charts + API + calculations]
  -> Phase 4.1 (prediction engine) [depends on calculations lib]
    -> Phase 4.2 (predictor page) [depends on prediction engine + charts + API]
```

### Recommended Build Order

1. `lib/types.ts` + `lib/utils.ts` (no dependencies)
2. `lib/db.ts` + `lib/schema.ts` + `lib/migrate.ts`
3. `scripts/seed.ts` (run it, verify DB has data)
4. `lib/calculations.ts` (can be tested independently with known values from Excel)
5. API routes (start with loans, then payments, then amortization)
6. `app/layout.tsx` + `components/layout/*` (sidebar, header)
7. Dashboard page + components
8. Loan detail + payment pages
9. Chart components (build alongside the pages that use them)
10. Amortization page
11. Predictor page (the capstone)

---

## Key Design Decisions and Rationale

### 1. SQLite over Postgres
Perfect for a single-user hobby app. No server to manage. `better-sqlite3` is synchronous and extremely fast. The database file lives alongside the app in `data/loanfree.db`.

### 2. Drizzle ORM vs Raw SQL
Use Drizzle for schema definition and type safety, but for complex queries (aggregations for summaries), use `db.prepare()` directly. Drizzle provides the schema as the source of truth for migrations.

### 3. Storing Actual vs Projected Amortization
The `amortization_entries` table stores actual bank-reported data (`is_actual = 1`). Projected entries are computed on-the-fly by `lib/calculations.ts` and NOT stored in the DB. This avoids stale projections when parameters change. The seed script stores only the 24 actual months.

### 4. Interest Records as Separate Table
Bank-reported monthly interest often does not match `outstanding * rate / 12` due to daily compounding, partial months, and rate changes. Keeping a separate `interest_records` table lets us track actual bank-charged interest independently from calculated interest.

### 5. Client-Side Prediction Computation
The predictor page computes scenarios in the browser for instant feedback. `lib/calculations.ts` is isomorphic (pure math, no Node APIs). This avoids API round-trips on every slider change.

### 6. Indian Number Formatting
All currency displays use Indian numbering (Lakhs/Crores): `₹54,64,018` not `₹5,464,018`. The `formatINR` utility handles this using `Intl.NumberFormat('en-IN')`.

### 7. Payment Type Taxonomy
Four payment types cover all data:
- `emi`: Monthly EMI to bank (₹87,500)
- `prepayment`: Extra payment to bank reducing principal (₹12,500/month)
- `builder`: Payment to property builder (construction-linked)
- `personal`: Payments to individuals (Rashmitha)

### 8. Rashmitha as a "Personal" Loan
Rather than a separate concept, Rashmitha's payment tracking fits naturally as a loan with `loan_type = 'personal'`, zero interest, and only payment entries. The dashboard and loan list handle both types, but amortization/predictor are hidden for personal loans.

---

## Edge Cases and Gotchas

1. **First amortization month (Mar 2024)**: Interest is 40,180 (from bank), not `11000000 * 0.071 / 12 = 65,083`. This is because the full 1.1Cr was not disbursed yet in March -- only 36.3L was disbursed in Feb 2024. The app must use actual bank interest for historical months.

2. **Disbursement-aware interest**: For under-construction properties, interest is only charged on disbursed amount, not sanctioned amount. The seed data handles this via actual interest records. For projections, we use the full outstanding balance.

3. **EMI hike timing**: The Excel shows EMI hikes at row 45 (Mar 2026), row 57 (Mar 2027), etc. -- every 12 months from the start. The calculation engine must track months-since-start and apply hikes at the correct interval.

4. **Prepayment column offset**: The Excel uses a +10 row offset for the prepayment reference (`E22 = E21 - SUM(F32, C22)`). This is an Excel layout quirk. The app uses direct references: `outstanding = prev_outstanding - principal - prepayment`.

5. **Loan payoff final month**: When outstanding < EMI, the final payment equals the outstanding balance. The calculation must handle this gracefully (no negative balances).

6. **Date handling**: All dates stored as ISO strings in SQLite. Use `date-fns` for arithmetic. The Excel dates are JS Date objects from openpyxl -- the seed script must convert them to ISO format.

---

## Testing Strategy

- **`lib/calculations.ts`**: Unit tests comparing output against known Excel values. Verify that `generateAmortizationSchedule` with the Park East parameters produces the same outstanding balance trajectory as the Calculator sheet (within rounding tolerance of ₹1).
- **API routes**: Test with `curl` or a simple test script hitting each endpoint.
- **Seed script**: Verify row counts and totals match Excel (payments: 11 builder + ~50 bank, disbursements: 4, interest: 27, amortization: 24 actual).
- **Predictor**: Compare app output with Excel Calculator values: with 5% annual hike and 12,500 prepayment, loan should be paid off around Aug 2032, total interest ~33.2L.

---

## Summary of Deliverables by Phase

| Phase | Deliverable | Files | Priority |
|-------|------------|-------|----------|
| 1 | Project + DB + Seed | 7 files | Must-have |
| 2 | API + Layout + Dashboard + Loans + Payments | ~20 files | Must-have |
| 3 | Charts + Amortization page | ~10 files | Must-have |
| 4 | Predictor page | ~10 files | Must-have (KEY) |
| 5 | Polish, import, export | ~5 files | Nice-to-have |
