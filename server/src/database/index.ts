/**
 * データベース接続とマイグレーション管理
 * Phase 0 Day 2 - 午後実装
 */

import { drizzle } from 'drizzle-orm/bun-sqlite';
import Database from 'bun:sqlite';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { runMigrations } from './migrate';

// データベースファイルパス
const DB_PATH = process.env.DATABASE_URL || './data/dev.db';

// SQLite接続
const sqlite = new Database(DB_PATH);
sqlite.run('PRAGMA journal_mode = WAL;');  // パフォーマンス向上
sqlite.run('PRAGMA synchronous = NORMAL;'); // 安全性とパフォーマンスのバランス
sqlite.run('PRAGMA cache_size = 1000;');    // キャッシュサイズ
sqlite.run('PRAGMA foreign_keys = ON;');    // 外部キー制約有効化

// Drizzle DB インスタンス
export const db = drizzle(sqlite, { schema });

/**
 * データベース初期化
 */
export async function initializeDatabase() {
  try {
    // マイグレーション実行（better-sqlite3使用）
    await runMigrations();
    
    // 基本データのシード
    await seedBasicData();
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * 基本データのシード
 */
async function seedBasicData() {
  try {
    // 実験設定のシード
    const existingExperiment = await db
      .select()
      .from(schema.experiments)
      .where(sql`name = 'Phase 0 Pilot'`)
      .limit(1);

    if (existingExperiment.length === 0) {
      const experimentId = await db
        .insert(schema.experiments)
        .values({
          name: 'Phase 0 Pilot',
          description: 'Initial pilot study for dynamic UI effectiveness',
          configVersion: 'v1',
          weightsVersion: 'v1',
          startDate: new Date()
        })
        .returning({ id: schema.experiments.id });

      console.log('📊 Seeded experiment:', experimentId[0]?.id);
    } else {
      console.log('📊 Experiment data already exists');
    }
  } catch (error) {
    console.warn('⚠️ Seed data creation failed (non-critical):', error.message);
  }
}

/**
 * ヘルスチェック
 */
export async function checkDatabaseHealth() {
  try {
    // 簡単なクエリでDB接続確認
    const result = await db
      .select({ count: sql`count(*)` })
      .from(schema.experiments);
    
    return {
      status: 'healthy',
      experimentCount: result[0]?.count,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * データクリーンアップ（開発用）
 */
export async function clearAllData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot clear data in production');
  }

  await db.delete(schema.measurementEvents);
  await db.delete(schema.priorityScores);
  await db.delete(schema.uiGenerationRequests);
  await db.delete(schema.userAssignments);
  await db.delete(schema.systemLogs);
  
  console.log('🧹 All data cleared');
}

// 型エクスポート
export * from './schema';
