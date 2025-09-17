CREATE TABLE "experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"config_version" text NOT NULL,
	"weights_version" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "measurement_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"anonymous_user_id" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now(),
	"event_type" text NOT NULL,
	"screen_id" text,
	"ui_variant" text,
	"generation_id" uuid,
	"metadata" jsonb NOT NULL,
	"experiment_condition" text,
	"config_version" text
);
--> statement-breakpoint
CREATE TABLE "priority_scores" (
	"score_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anonymous_user_id" text NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now(),
	"context_factors" jsonb NOT NULL,
	"config_version" text NOT NULL,
	"weights_version" text NOT NULL,
	"concern_scores" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now(),
	"level" text NOT NULL,
	"component" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"request_id" text
);
--> statement-breakpoint
CREATE TABLE "ui_generation_requests" (
	"generation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"anonymous_user_id" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now(),
	"concern_text" text NOT NULL,
	"selected_category" text NOT NULL,
	"selected_approach" text NOT NULL,
	"urgency_choice" text NOT NULL,
	"concern_level" text NOT NULL,
	"custom_action_text" text,
	"time_of_day" text NOT NULL,
	"available_time_min" integer NOT NULL,
	"factors" jsonb NOT NULL,
	"ui_variant" text NOT NULL,
	"novelty_level" text,
	"ui_dsl" jsonb NOT NULL,
	"model_used" text NOT NULL,
	"seed_used" integer,
	"processing_time_ms" integer,
	"fallback_used" integer DEFAULT 0,
	"prompt_tokens" integer,
	"response_tokens" integer
);
--> statement-breakpoint
CREATE TABLE "user_assignments" (
	"anonymous_user_id" text PRIMARY KEY NOT NULL,
	"experiment_id" uuid NOT NULL,
	"condition" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "measurement_events" ADD CONSTRAINT "measurement_events_generation_id_ui_generation_requests_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."ui_generation_requests"("generation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_events_user_time" ON "measurement_events" USING btree ("anonymous_user_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_events_session_type" ON "measurement_events" USING btree ("session_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_events_variant_type" ON "measurement_events" USING btree ("ui_variant","event_type");--> statement-breakpoint
CREATE INDEX "idx_events_generation" ON "measurement_events" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "idx_scores_user_time" ON "priority_scores" USING btree ("anonymous_user_id","calculated_at");--> statement-breakpoint
CREATE INDEX "idx_logs_time_level" ON "system_logs" USING btree ("logged_at","level");--> statement-breakpoint
CREATE INDEX "idx_logs_component_time" ON "system_logs" USING btree ("component","logged_at");--> statement-breakpoint
CREATE INDEX "idx_generation_user_time" ON "ui_generation_requests" USING btree ("anonymous_user_id","requested_at");--> statement-breakpoint
CREATE INDEX "idx_generation_session" ON "ui_generation_requests" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_generation_variant_novelty" ON "ui_generation_requests" USING btree ("ui_variant","novelty_level");--> statement-breakpoint
CREATE INDEX "idx_assignment_exp_condition" ON "user_assignments" USING btree ("experiment_id","condition");