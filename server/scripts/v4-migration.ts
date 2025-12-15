/**
 * V4 Migration Script
 *
 * 実験関連テーブルをTRUNCATEし、新しいスキーマに対応
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// PostgreSQL接続URL
const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

async function main() {
  console.log('🔧 V4 Migration Script');
  console.log('=======================');

  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  try {
    // Step 1: TRUNCATE existing data
    console.log('\n📦 Step 1: Truncating experiment tables...');

    await db.execute(sql`TRUNCATE experiment_generations, widget_states, experiment_sessions CASCADE`);
    console.log('   ✓ Truncated: experiment_generations, widget_states, experiment_sessions');

    // Step 2: Drop old columns (if exist)
    console.log('\n📦 Step 2: Dropping old columns...');

    // Drop columns that no longer exist in V4
    const oldColumns = [
      'generated_oodm',
      'generated_dsl',
      'prompt_tokens',
      'response_tokens',
      'generate_duration'
    ];

    for (const col of oldColumns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE experiment_generations DROP COLUMN IF EXISTS ${col}`));
        console.log(`   ✓ Dropped column: ${col}`);
      } catch (e) {
        console.log(`   - Column ${col} does not exist or already dropped`);
      }
    }

    // Step 3: Add new V4 columns
    console.log('\n📦 Step 3: Adding V4 columns...');

    const newColumns = [
      { name: 'generated_widget_selection', type: 'jsonb' },
      { name: 'generated_ors', type: 'jsonb' },
      { name: 'generated_ui_spec', type: 'jsonb' },
      { name: 'widget_selection_tokens', type: 'integer' },
      { name: 'widget_selection_duration', type: 'integer' },
      { name: 'ors_tokens', type: 'integer' },
      { name: 'ors_duration', type: 'integer' },
      { name: 'ui_spec_tokens', type: 'integer' },
      { name: 'ui_spec_duration', type: 'integer' },
      { name: 'total_prompt_tokens', type: 'integer' },
      { name: 'total_response_tokens', type: 'integer' },
      { name: 'total_generate_duration', type: 'integer' },
    ];

    for (const col of newColumns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE experiment_generations ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`));
        console.log(`   ✓ Added column: ${col.name} (${col.type})`);
      } catch (e) {
        console.log(`   - Column ${col.name} already exists`);
      }
    }

    // Step 4: Make prompt column nullable (if not already)
    console.log('\n📦 Step 4: Making prompt column nullable...');
    try {
      await db.execute(sql`ALTER TABLE experiment_generations ALTER COLUMN prompt DROP NOT NULL`);
      console.log('   ✓ prompt column is now nullable');
    } catch (e) {
      console.log('   - prompt column already nullable or does not exist');
    }

    console.log('\n✅ V4 Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
