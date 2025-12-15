CREATE TABLE "experiment_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"model_id" text NOT NULL,
	"prompt" text NOT NULL,
	"generated_oodm" jsonb,
	"generated_dsl" jsonb,
	"prompt_tokens" integer,
	"response_tokens" integer,
	"generate_duration" integer,
	"render_duration" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "experiment_generations" ADD CONSTRAINT "experiment_generations_session_id_experiment_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."experiment_sessions"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_generations_session" ON "experiment_generations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_generations_stage" ON "experiment_generations" USING btree ("session_id","stage");