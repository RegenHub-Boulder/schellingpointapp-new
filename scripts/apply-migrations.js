/**
 * Apply migrations to Supabase database
 * Usage: node scripts/apply-migrations.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

async function runSQL(sql, description) {
  console.log(`\n📦 Running: ${description}...`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    // Try the query endpoint instead
    const queryResponse = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!queryResponse.ok) {
      const error = await queryResponse.text();
      throw new Error(`Failed to run SQL: ${error}`);
    }

    return await queryResponse.json();
  }

  return await response.json();
}

async function main() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  // Get migration files sorted by name
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && f.includes('ethboulder'))
    .sort();

  console.log('🚀 Applying EthBoulder migrations to:', SUPABASE_URL);
  console.log('📁 Found migrations:', files);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      await runSQL(sql, file);
      console.log(`✅ ${file} applied successfully`);
    } catch (error) {
      console.error(`❌ ${file} failed:`, error.message);
      console.log('\n💡 You may need to run this SQL manually in the Supabase Dashboard:');
      console.log(`   ${SUPABASE_URL.replace('.supabase.co', '.supabase.co/project/_/sql')}`);
      process.exit(1);
    }
  }

  console.log('\n✨ All migrations applied successfully!');
}

main().catch(console.error);
