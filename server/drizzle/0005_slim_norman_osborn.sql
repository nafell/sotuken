ALTER TABLE "experiment_trial_logs" ADD COLUMN "w2wr_errors" jsonb;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "react_component_errors" jsonb;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD COLUMN "jotai_atom_errors" jsonb;