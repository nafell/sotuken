/**
 * Bunネイティブsqlite用マイグレーション
 * Phase 0 Day 2 - SQLマイグレーション実行
 */

import Database from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = process.env.DATABASE_URL || './data/dev.db';

export async function runMigrations() {
  const db = new Database(DB_PATH);
  
  try {
    console.log('🔧 Running migrations with Bun SQLite...');
    
    // WALモードとその他の最適化設定
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA synchronous = NORMAL');
    db.run('PRAGMA cache_size = 1000');
    db.run('PRAGMA foreign_keys = ON');
    
    // マイグレーションテーブルの作成
    db.run(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    
    // 最新のマイグレーション確認
    const migrationPath = join(process.cwd(), 'drizzle/0000_fair_malice.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // マイグレーションが既に実行されているか確認
    const existingMigration = db.query('SELECT * FROM __drizzle_migrations WHERE hash = ?').get('0000_fair_malice');
    
    if (!existingMigration) {
      console.log('📝 Executing migration: 0000_fair_malice');
      
      // SQLステートメントを分割して実行
      const statements = migrationSQL
        .split('--> statement-breakpoint')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      db.run('BEGIN TRANSACTION');
      
      try {
        for (const statement of statements) {
          if (statement.trim()) {
            db.run(statement);
          }
        }
        
        // マイグレーション記録を追加
        db.run(
          'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
          '0000_fair_malice',
          Math.floor(Date.now() / 1000)
        );
        
        db.run('COMMIT');
        console.log('✅ Migration completed successfully');
      } catch (error) {
        db.run('ROLLBACK');
        throw error;
      }
    } else {
      console.log('✅ Database already up to date');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// スタンドアロン実行
if (import.meta.main) {
  await runMigrations();
}