ALTER TABLE "experiment_trial_logs" ALTER COLUMN "prompt_data" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "input_variables" jsonb;