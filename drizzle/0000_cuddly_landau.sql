CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`signal_id` text NOT NULL,
	`submitter_wallet` text NOT NULL,
	`public_url` text,
	`object_key` text,
	`content_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `identity_links` (
	`x_user_id` text PRIMARY KEY NOT NULL,
	`x_handle` text NOT NULL,
	`wallet` text NOT NULL,
	`signature` text NOT NULL,
	`linked_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `signals` (
	`id` text PRIMARY KEY NOT NULL,
	`chain_id` integer DEFAULT 137 NOT NULL,
	`contract_request_id` text,
	`sender_x_id` text NOT NULL,
	`sender_handle` text NOT NULL,
	`target_x_id` text NOT NULL,
	`target_handle` text NOT NULL,
	`employer_wallet` text NOT NULL,
	`employee_wallet` text,
	`title` text NOT NULL,
	`terms` text NOT NULL,
	`amount_atomic` text NOT NULL,
	`attention_atomic` text NOT NULL,
	`accept_by` integer NOT NULL,
	`deliver_by` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`funding_hash` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
