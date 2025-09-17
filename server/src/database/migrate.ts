/**
 * PostgreSQL用マイグレーション
 * Phase 0 Day 2 - PostgreSQL移行版マイグレーション実行
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './index.js';

export async function runMigrations() {
  try {
    console.log('🔧 Running PostgreSQL migrations...');
    
    // Drizzle ORMの migrate 関数を使用
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('✅ PostgreSQL migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// スタンドアロン実行
if (import.meta.main) {
  await runMigrations();
}