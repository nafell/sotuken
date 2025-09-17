/**
 * データベース接続とマイグレーション管理
 * Phase 0 Day 2 - 午後実装（PostgreSQL移行版）
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { runMigrations } from './migrate';

// PostgreSQL接続URL
const DATABASE_URL = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// PostgreSQL接続
const sql_client = postgres(DATABASE_URL, {
  max: 10,              // 最大接続数
  idle_timeout: 20,     // アイドル接続タイムアウト（秒）
  connect_timeout: 10,  // 接続タイムアウト（秒）
});

// Drizzle DB インスタンス
export const db = drizzle(sql_client, { schema });

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
      .where(sql`${schema.experiments.name} = 'Phase 0 Pilot'`)
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
