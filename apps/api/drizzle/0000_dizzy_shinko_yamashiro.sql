CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`hourly_rate_cents` integer NOT NULL,
	`deactivated_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`date` text NOT NULL,
	`hours` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `time_entries_employee_idx` ON `time_entries` (`employee_id`);--> statement-breakpoint
CREATE INDEX `time_entries_employee_date_idx` ON `time_entries` (`employee_id`,`date`);--> statement-breakpoint
CREATE TABLE `week_reviews` (
	`employee_id` text NOT NULL,
	`week_start` text NOT NULL,
	`status` text NOT NULL,
	`reviewed_at` text NOT NULL,
	PRIMARY KEY(`employee_id`, `week_start`),
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
