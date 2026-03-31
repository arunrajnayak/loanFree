CREATE TABLE `disbursements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`loan_id` integer NOT NULL,
	`date` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `interest_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`loan_id` integer NOT NULL,
	`month` text NOT NULL,
	`amount` real NOT NULL,
	`outstanding_balance` real,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`loan_type` text DEFAULT 'home' NOT NULL,
	`sanctioned_amount` real NOT NULL,
	`interest_rate` real NOT NULL,
	`tenure_years` integer NOT NULL,
	`emi` real NOT NULL,
	`start_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`loan_id` integer NOT NULL,
	`date` text NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`principal_component` real,
	`interest_component` real,
	`notes` text,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prediction_scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`loan_id` integer NOT NULL,
	`name` text NOT NULL,
	`extra_monthly` real DEFAULT 0 NOT NULL,
	`extra_emi_per_year` integer DEFAULT 0 NOT NULL,
	`annual_hike_pct` real DEFAULT 0 NOT NULL,
	`lump_sum_amount` real DEFAULT 0,
	`lump_sum_month` text,
	`is_default` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
