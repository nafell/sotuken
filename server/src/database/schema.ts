/**
 * サーバーサイドデータベーススキーマ（SQLite + Drizzle）
 * Phase 0 Day 2 - 午後実装
 * @see specs/system-design/database_schema.md
 */

import { sqliteTable, text, integer, blob, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ========================================
// 実験管理テーブル
// ========================================

export const experiments = sqliteTable('experiments', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  name: text('name').notNull(),
  description: text('description'),
  configVersion: text('config_version').notNull(),
  weightsVersion: text('weights_version').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
});

export const userAssignments = sqliteTable('user_assignments', {
  anonymousUserId: text('anonymous_user_id').primaryKey(),
  experimentId: text('experiment_id').notNull().references(() => experiments.id),
  condition: text('condition').notNull(), // 'static_ui' | 'dynamic_ui'
  assignedAt: integer('assigned_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
}, (table) => ({
  assignmentExpConditionIdx: index('idx_assignment_exp_condition').on(table.experimentId, table.condition)
}));

// ========================================
// UI生成リクエストテーブル
// ========================================

export const uiGenerationRequests = sqliteTable('ui_generation_requests', {
  generationId: text('generation_id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  sessionId: text('session_id').notNull(),
  anonymousUserId: text('anonymous_user_id').notNull(),
  requestedAt: integer('requested_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  
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
  factors: blob('factors', { mode: 'json' }).notNull(), // factors辞書（抽象化済み）
  
  // 生成結果
  uiVariant: text('ui_variant').notNull(), // 'static' | 'dynamic'
  noveltyLevel: text('novelty_level'), // 'low' | 'med' | 'high'
  uiDsl: blob('ui_dsl', { mode: 'json' }).notNull(), // 生成されたDSL
  
  // メタデータ
  modelUsed: text('model_used').notNull(),
  seedUsed: integer('seed_used'),
  processingTimeMs: integer('processing_time_ms'),
  fallbackUsed: integer('fallback_used', { mode: 'boolean' }).default(false),
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

export const measurementEvents = sqliteTable('measurement_events', {
  eventId: text('event_id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  sessionId: text('session_id').notNull(),
  anonymousUserId: text('anonymous_user_id').notNull(),
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  
  eventType: text('event_type').notNull(), // 'ui_shown' | 'action_started' | etc.
  screenId: text('screen_id'),
  uiVariant: text('ui_variant'), // 'static' | 'dynamic'
  generationId: text('generation_id').references(() => uiGenerationRequests.generationId),
  
  // 測定用メタデータ
  metadata: blob('metadata', { mode: 'json' }).notNull(),
  
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

export const priorityScores = sqliteTable('priority_scores', {
  scoreId: text('score_id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  anonymousUserId: text('anonymous_user_id').notNull(),
  calculatedAt: integer('calculated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  
  // コンテキスト情報
  contextFactors: blob('context_factors', { mode: 'json' }).notNull(),
  configVersion: text('config_version').notNull(),
  weightsVersion: text('weights_version').notNull(),
  
  // 計算結果
  concernScores: blob('concern_scores', { mode: 'json' }).notNull() // [{"id": "concern_001", "score": 0.75, "reasoning": {...}}]
}, (table) => ({
  scoresUserTimeIdx: index('idx_scores_user_time').on(table.anonymousUserId, table.calculatedAt)
}));

// ========================================
// システムログテーブル
// ========================================

export const systemLogs = sqliteTable('system_logs', {
  logId: text('log_id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  loggedAt: integer('logged_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  level: text('level').notNull(), // 'INFO' | 'WARN' | 'ERROR'
  component: text('component').notNull(), // 'ui_generation' | 'scoring' | 'events'
  message: text('message').notNull(),
  metadata: blob('metadata', { mode: 'json' }),
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
