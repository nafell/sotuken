CREATE TABLE "experiment_sessions" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_type" text NOT NULL,
	"case_id" text NOT NULL,
	"evaluator_id" text,
	"widget_count" integer NOT NULL,
	"model_id" text NOT NULL,
	"concern_text" text NOT NULL,
	"context_factors" jsonb NOT NULL,
	"generated_oodm" jsonb,
	"generated_dpg" jsonb,
	"generated_dsl" jsonb,
	"oodm_metrics" jsonb,
	"dsl_metrics" jsonb,
	"total_tokens" integer,
	"total_latency_ms" integer,
	"generation_success" boolean,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"forms_response_id" text
);
--> statement-breakpoint
CREATE TABLE "widget_states" (
	"state_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"step_index" integer NOT NULL,
	"widget_type" text NOT NULL,
	"widget_config" jsonb NOT NULL,
	"user_inputs" jsonb,
	"port_values" jsonb,
	"recorded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "widget_states" ADD CONSTRAINT "widget_states_session_id_experiment_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."experiment_sessions"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sessions_type" ON "experiment_sessions" USING btree ("experiment_type");--> statement-breakpoint
CREATE INDEX "idx_sessions_case" ON "experiment_sessions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_model" ON "experiment_sessions" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_started_at" ON "experiment_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_widget_states_session" ON "widget_states" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_widget_states_step" ON "widget_states" USING btree ("session_id","step_index");