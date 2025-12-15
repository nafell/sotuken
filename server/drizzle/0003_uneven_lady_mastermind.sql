CREATE TABLE "batch_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" text NOT NULL,
	"model_configs" jsonb NOT NULL,
	"input_corpus_id" text NOT NULL,
	"parallelism" integer DEFAULT 1 NOT NULL,
	"headless_mode" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"total_trials" integer NOT NULL,
	"completed_trials" integer DEFAULT 0 NOT NULL,
	"failed_trials" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"layer1_results" jsonb,
	"layer4_results" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "experiment_trial_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" text NOT NULL,
	"batch_id" uuid NOT NULL,
	"trial_number" integer NOT NULL,
	"input_id" text NOT NULL,
	"model_config" text NOT NULL,
	"model_router_selection" jsonb,
	"stage" integer NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer NOT NULL,
	"dsl_errors" jsonb,
	"render_errors" jsonb,
	"type_error_count" integer DEFAULT 0 NOT NULL,
	"reference_error_count" integer DEFAULT 0 NOT NULL,
	"cycle_detected" boolean DEFAULT false NOT NULL,
	"regenerated" boolean DEFAULT false NOT NULL,
	"runtime_error" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "experiment_generations" ALTER COLUMN "prompt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "generated_widget_selection" jsonb;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "generated_ors" jsonb;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "generated_ui_spec" jsonb;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "widget_selection_tokens" integer;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "widget_selection_duration" integer;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "ors_tokens" integer;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "ors_duration" integer;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "ui_spec_tokens" integer;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "ui_spec_duration" integer;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "total_prompt_tokens" integer;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "total_response_tokens" integer;--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD COLUMN IF NOT EXISTS "total_generate_duration" integer;--> statement-breakpoint
ALTER TABLE "experiment_sessions" ADD COLUMN IF NOT EXISTS "use_mock_widget_selection" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "experiment_trial_logs" ADD CONSTRAINT "experiment_trial_logs_batch_id_batch_executions_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch_executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_batch_experiment" ON "batch_executions" USING btree ("experiment_id");--> statement-breakpoint
CREATE INDEX "idx_batch_status" ON "batch_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_trial_batch" ON "experiment_trial_logs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_trial_experiment" ON "experiment_trial_logs" USING btree ("experiment_id");--> statement-breakpoint
CREATE INDEX "idx_trial_config" ON "experiment_trial_logs" USING btree ("model_config");--> statement-breakpoint
CREATE INDEX "idx_trial_stage" ON "experiment_trial_logs" USING btree ("batch_id","trial_number","stage");--> statement-breakpoint
ALTER TABLE "experiment_generations" DROP COLUMN IF EXISTS "generated_oodm";--> statement-breakpoint
ALTER TABLE "experiment_generations" DROP COLUMN IF EXISTS "generated_dsl";--> statement-breakpoint
ALTER TABLE "experiment_generations" DROP COLUMN IF EXISTS "prompt_tokens";--> statement-breakpoint
ALTER TABLE "experiment_generations" DROP COLUMN IF EXISTS "response_tokens";--> statement-breakpoint
ALTER TABLE "experiment_generations" DROP COLUMN IF EXISTS "generate_duration";