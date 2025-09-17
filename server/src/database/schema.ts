/**
 * サーバーサイドデータベーススキーマ（PostgreSQL + Drizzle）
 * Phase 0 Day 2 - 午後実装（PostgreSQL移行版）
 * @see specs/system-design/database_schema.md
 */

import { pgTable, text, integer, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ========================================
// 実験管理テーブル
// ========================================

export const experiments = pgTable('experiments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  configVersion: text('config_version').notNull(),
  weightsVersion: text('weights_version').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`)
});

export const userAssignments = pgTable('user_assignments', {
  anonymousUserId: text('anonymous_user_id').primaryKey(),
  experimentId: uuid('experiment_id').notNull().references(() => experiments.id),
  condition: text('condition').notNull(), // 'static_ui' | 'dynamic_ui'
  assignedAt: timestamp('assigned_at', { withTimezone: true }).default(sql`now()`)
}, (table) => ({
  assignmentExpConditionIdx: index('idx_assignment_exp_condition').on(table.experimentId, table.condition)
}));

// ========================================
// UI生成リクエストテーブル
// ========================================

export const uiGenerationRequests = pgTable('ui_generation_requests', {
  generationId: uuid('generation_id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text('session_id').notNull(),
  anonymousUserId: text('anonymous_user_id').notNull(),
  requestedAt: timestamp('requested_at', { withTimezone: true }).default(sql`now()`),
  
  // ユーザー明示入力
  concernText: text('concern_text').notNull(),
  selectedCategory: text('selected_category').notNull(),
  selectedApproach: text('selected_approach').notNull(),
  urgencyChoice: text('urgency_choice').notNull(),
  concernLevel: text('concern_level').notNull(),
  customActionText: text('custom_action_text'),
  
  // システム推論コンテキスト（抽象化済み）
  timeOfDay: text('time_of_day').notNull(),
  availableTimeMin: integer('available_time_min').notNull(),
  factors: jsonb('factors').notNull(), // factors辞書（抽象化済み）
  
  // 生成結果
  uiVariant: text('ui_variant').notNull(), // 'static' | 'dynamic'
  noveltyLevel: text('novelty_level'), // 'low' | 'med' | 'high'
  uiDsl: jsonb('ui_dsl').notNull(), // 生成されたDSL
  
  // メタデータ
  modelUsed: text('model_used').notNull(),
  seedUsed: integer('seed_used'),
  processingTimeMs: integer('processing_time_ms'),
  fallbackUsed: integer('fallback_used').default(0), // PostgreSQL uses 0/1 for boolean in integer
  promptTokens: integer('prompt_tokens'),
  responseTokens: integer('response_tokens')
}, (table) => ({
  generationUserTimeIdx: index('idx_generation_user_time').on(table.anonymousUserId, table.requestedAt),
  generationSessionIdx: index('idx_generation_session').on(table.sessionId),
  generationVariantNoveltyIdx: index('idx_generation_variant_novelty').on(table.uiVariant, table.noveltyLevel)
}));

// ========================================
// 測定イベントテーブル
// ========================================

export const measurementEvents = pgTable('measurement_events', {
  eventId: uuid('event_id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text('session_id').notNull(),
  anonymousUserId: text('anonymous_user_id').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).default(sql`now()`),
  
  eventType: text('event_type').notNull(), // 'ui_shown' | 'action_started' | etc.
  screenId: text('screen_id'),
  uiVariant: text('ui_variant'), // 'static' | 'dynamic'
  generationId: uuid('generation_id').references(() => uiGenerationRequests.generationId),
  
  // 測定用メタデータ
  metadata: jsonb('metadata').notNull(),
  
  // 研究分析用
  experimentCondition: text('experiment_condition'),
  configVersion: text('config_version')
}, (table) => ({
  eventsUserTimeIdx: index('idx_events_user_time').on(table.anonymousUserId, table.recordedAt),
  eventsSessionTypeIdx: index('idx_events_session_type').on(table.sessionId, table.eventType),
  eventsVariantTypeIdx: index('idx_events_variant_type').on(table.uiVariant, table.eventType),
  eventsGenerationIdx: index('idx_events_generation').on(table.generationId)
}));

// ========================================
// 優先スコアテーブル
// ========================================

export const priorityScores = pgTable('priority_scores', {
  scoreId: uuid('score_id').primaryKey().default(sql`gen_random_uuid()`),
  anonymousUserId: text('anonymous_user_id').notNull(),
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).default(sql`now()`),
  
  // コンテキスト情報
  contextFactors: jsonb('context_factors').notNull(),
  configVersion: text('config_version').notNull(),
  weightsVersion: text('weights_version').notNull(),
  
  // 計算結果
  concernScores: jsonb('concern_scores').notNull() // [{"id": "concern_001", "score": 0.75, "reasoning": {...}}]
}, (table) => ({
  scoresUserTimeIdx: index('idx_scores_user_time').on(table.anonymousUserId, table.calculatedAt)
}));

// ========================================
// システムログテーブル
// ========================================

export const systemLogs = pgTable('system_logs', {
  logId: uuid('log_id').primaryKey().default(sql`gen_random_uuid()`),
  loggedAt: timestamp('logged_at', { withTimezone: true }).default(sql`now()`),
  level: text('level').notNull(), // 'INFO' | 'WARN' | 'ERROR'
  component: text('component').notNull(), // 'ui_generation' | 'scoring' | 'events'
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  requestId: text('request_id')
}, (table) => ({
  logsTimeLevelIdx: index('idx_logs_time_level').on(table.loggedAt, table.level),
  logsComponentTimeIdx: index('idx_logs_component_time').on(table.component, table.loggedAt)
}));

// ========================================
// 型エクスポート
// ========================================

export type Experiment = typeof experiments.$inferSelect;
export type NewExperiment = typeof experiments.$inferInsert;

export type UserAssignment = typeof userAssignments.$inferSelect;
export type NewUserAssignment = typeof userAssignments.$inferInsert;

export type UIGenerationRequest = typeof uiGenerationRequests.$inferSelect;
export type NewUIGenerationRequest = typeof uiGenerationRequests.$inferInsert;

export type MeasurementEvent = typeof measurementEvents.$inferSelect;
export type NewMeasurementEvent = typeof measurementEvents.$inferInsert;

export type PriorityScore = typeof priorityScores.$inferSelect;
export type NewPriorityScore = typeof priorityScores.$inferInsert;

export type SystemLog = typeof systemLogs.$inferSelect;
export type NewSystemLog = typeof systemLogs.$inferInsert;
