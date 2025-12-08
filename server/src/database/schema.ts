/**
 * サーバーサイドデータベーススキーマ（PostgreSQL + Drizzle）
 * Phase 0 Day 2 - 午後実装（PostgreSQL移行版）
 * @see specs/system-design/database_schema.md
 */

import { pgTable, text, integer, timestamp, uuid, jsonb, index, boolean } from 'drizzle-orm/pg-core';
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
// Phase 6: 実験セッション管理テーブル
// ========================================

export const experimentSessions = pgTable('experiment_sessions', {
  sessionId: uuid('session_id').primaryKey().default(sql`gen_random_uuid()`),
  experimentType: text('experiment_type').notNull(), // 'technical' | 'expert' | 'user'
  caseId: text('case_id').notNull(),
  evaluatorId: text('evaluator_id'),

  // 実験条件
  widgetCount: integer('widget_count').notNull(),
  modelId: text('model_id').notNull(),
  useMockWidgetSelection: boolean('use_mock_widget_selection').default(false),

  // 入力データ
  concernText: text('concern_text').notNull(),
  contextFactors: jsonb('context_factors').notNull(),

  // 生成結果（各フェーズ分離保存）
  generatedOodm: jsonb('generated_oodm'),
  generatedDpg: jsonb('generated_dpg'),
  generatedDsl: jsonb('generated_dsl'),

  // メトリクス
  oodmMetrics: jsonb('oodm_metrics'), // { tokens, latencyMs }
  dslMetrics: jsonb('dsl_metrics'),   // { tokens, latencyMs }
  totalTokens: integer('total_tokens'),
  totalLatencyMs: integer('total_latency_ms'),
  generationSuccess: boolean('generation_success'),
  errorMessage: text('error_message'),

  // タイムスタンプ
  startedAt: timestamp('started_at', { withTimezone: true }).default(sql`now()`),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // 外部連携（Microsoft Forms）
  formsResponseId: text('forms_response_id')
}, (table) => ({
  sessionsTypeIdx: index('idx_sessions_type').on(table.experimentType),
  sessionsCaseIdx: index('idx_sessions_case').on(table.caseId),
  sessionsModelIdx: index('idx_sessions_model').on(table.modelId),
  sessionsStartedAtIdx: index('idx_sessions_started_at').on(table.startedAt)
}));

// ========================================
// Phase 8: 生成履歴管理テーブル (1-to-N) - DSL v4対応
// ========================================

export const experimentGenerations = pgTable('experiment_generations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid('session_id').notNull().references(() => experimentSessions.sessionId),
  stage: text('stage').notNull(), // 'diverge' | 'organize' | 'converge' | 'summary'
  modelId: text('model_id').notNull(),
  prompt: text('prompt'),

  // V4 3段階LLM生成結果
  generatedWidgetSelection: jsonb('generated_widget_selection'), // Stage 1: Widget選定結果
  generatedOrs: jsonb('generated_ors'),                          // Stage 2: ORS
  generatedUiSpec: jsonb('generated_ui_spec'),                   // Stage 3: UISpec v4

  // V4 各段階メトリクス
  widgetSelectionTokens: integer('widget_selection_tokens'),
  widgetSelectionDuration: integer('widget_selection_duration'), // ms
  orsTokens: integer('ors_tokens'),
  orsDuration: integer('ors_duration'),                          // ms
  uiSpecTokens: integer('ui_spec_tokens'),
  uiSpecDuration: integer('ui_spec_duration'),                   // ms

  // 合計メトリクス
  totalPromptTokens: integer('total_prompt_tokens'),
  totalResponseTokens: integer('total_response_tokens'),
  totalGenerateDuration: integer('total_generate_duration'),     // ms
  renderDuration: integer('render_duration'),                    // ms (Client側で計測・更新)

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`)
}, (table) => ({
  generationsSessionIdx: index('idx_generations_session').on(table.sessionId),
  generationsStageIdx: index('idx_generations_stage').on(table.sessionId, table.stage)
}));

// ========================================
// Phase 6: Widget状態記録テーブル
// ========================================

export const widgetStates = pgTable('widget_states', {
  stateId: uuid('state_id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid('session_id').notNull().references(() => experimentSessions.sessionId),
  stepIndex: integer('step_index').notNull(),
  widgetType: text('widget_type').notNull(),

  // Widget設定・状態
  widgetConfig: jsonb('widget_config').notNull(),
  userInputs: jsonb('user_inputs'),
  portValues: jsonb('port_values'),

  // 記録時刻
  recordedAt: timestamp('recorded_at', { withTimezone: true }).default(sql`now()`)
}, (table) => ({
  widgetStatesSessionIdx: index('idx_widget_states_session').on(table.sessionId),
  widgetStatesStepIdx: index('idx_widget_states_step').on(table.sessionId, table.stepIndex)
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

export type ExperimentSession = typeof experimentSessions.$inferSelect;
export type NewExperimentSession = typeof experimentSessions.$inferInsert;

export type ExperimentGeneration = typeof experimentGenerations.$inferSelect;
export type NewExperimentGeneration = typeof experimentGenerations.$inferInsert;

export type WidgetState = typeof widgetStates.$inferSelect;
export type NewWidgetState = typeof widgetStates.$inferInsert;
