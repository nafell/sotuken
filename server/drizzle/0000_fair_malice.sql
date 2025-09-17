CREATE TABLE `experiments` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`config_version` text NOT NULL,
	`weights_version` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `measurement_events` (
	`event_id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`session_id` text NOT NULL,
	`anonymous_user_id` text NOT NULL,
	`recorded_at` integer DEFAULT (strftime('%s', 'now')),
	`event_type` text NOT NULL,
	`screen_id` text,
	`ui_variant` text,
	`generation_id` text,
	`metadata` blob NOT NULL,
	`experiment_condition` text,
	`config_version` text,
	FOREIGN KEY (`generation_id`) REFERENCES `ui_generation_requests`(`generation_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_events_user_time` ON `measurement_events` (`anonymous_user_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `idx_events_session_type` ON `measurement_events` (`session_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `idx_events_variant_type` ON `measurement_events` (`ui_variant`,`event_type`);--> statement-breakpoint
CREATE INDEX `idx_events_generation` ON `measurement_events` (`generation_id`);--> statement-breakpoint
CREATE TABLE `priority_scores` (
	`score_id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`anonymous_user_id` text NOT NULL,
	`calculated_at` integer DEFAULT (strftime('%s', 'now')),
	`context_factors` blob NOT NULL,
	`config_version` text NOT NULL,
	`weights_version` text NOT NULL,
	`concern_scores` blob NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scores_user_time` ON `priority_scores` (`anonymous_user_id`,`calculated_at`);--> statement-breakpoint
CREATE TABLE `system_logs` (
	`log_id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`logged_at` integer DEFAULT (strftime('%s', 'now')),
	`level` text NOT NULL,
	`component` text NOT NULL,
	`message` text NOT NULL,
	`metadata` blob,
	`request_id` text
);
--> statement-breakpoint
CREATE INDEX `idx_logs_time_level` ON `system_logs` (`logged_at`,`level`);--> statement-breakpoint
CREATE INDEX `idx_logs_component_time` ON `system_logs` (`component`,`logged_at`);--> statement-breakpoint
CREATE TABLE `ui_generation_requests` (
	`generation_id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`session_id` text NOT NULL,
	`anonymous_user_id` text NOT NULL,
	`requested_at` integer DEFAULT (strftime('%s', 'now')),
	`concern_text` text NOT NULL,
	`selected_category` text NOT NULL,
	`selected_approach` text NOT NULL,
	`urgency_choice` text NOT NULL,
	`concern_level` text NOT NULL,
	`custom_action_text` text,
	`time_of_day` text NOT NULL,
	`available_time_min` integer NOT NULL,
	`factors` blob NOT NULL,
	`ui_variant` text NOT NULL,
	`novelty_level` text,
	`ui_dsl` blob NOT NULL,
	`model_used` text NOT NULL,
	`seed_used` integer,
	`processing_time_ms` integer,
	`fallback_used` integer DEFAULT false,
	`prompt_tokens` integer,
	`response_tokens` integer
);
--> statement-breakpoint
CREATE INDEX `idx_generation_user_time` ON `ui_generation_requests` (`anonymous_user_id`,`requested_at`);--> statement-breakpoint
CREATE INDEX `idx_generation_session` ON `ui_generation_requests` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_generation_variant_novelty` ON `ui_generation_requests` (`ui_variant`,`novelty_level`);--> statement-breakpoint
CREATE TABLE `user_assignments` (
	`anonymous_user_id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`condition` text NOT NULL,
	`assigned_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_assignment_exp_condition` ON `user_assignments` (`experiment_id`,`condition`);