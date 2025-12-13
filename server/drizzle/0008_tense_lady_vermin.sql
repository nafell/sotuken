ALTER TABLE "experiment_trial_logs" ADD COLUMN "server_validated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "req_w2wr_pres" boolean;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "req_binding_count_ok" boolean;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "req_pattern_match" boolean;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "req_stage_forward_rate" real;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "js_parse_ok" boolean;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "js_policy_ok" boolean;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "w2wr_category" text;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "l1plus_validated_at" timestamp with time zone;