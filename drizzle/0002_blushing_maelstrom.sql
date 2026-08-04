CREATE TABLE `budgets` (
	`month` text PRIMARY KEY NOT NULL,
	`amount_yen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`default_budget_yen` integer DEFAULT 0 NOT NULL
);
