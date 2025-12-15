ALTER TABLE "batch_executions" ADD COLUMN "max_trials" integer;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "generated_data" jsonb;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "prompt_data" jsonb;