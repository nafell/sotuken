-- Add server_validated_at column to track server-side validation timestamp
-- LL-001 対応: null の曖昧性を解消するためのタイムスタンプカラム追加
ALTER TABLE "experiment_trial_logs" ADD COLUMN "server_validated_at" timestamp with time zone;