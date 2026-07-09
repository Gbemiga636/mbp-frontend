// Apply database schema to Supabase Postgres.
// Option A (recommended): paste supabase/schema.sql into Supabase Dashboard → SQL Editor → Run
// Option B: set DATABASE_URL in .env (Settings → Database → Connection string → URI) then:
//   node scripts/apply-schema.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';

async function main() {
  if (!DATABASE_URL) {
    console.log('DATABASE_URL is not set.\n');
    console.log('Please run the SQL manually:');
    console.log('  1. Open https://supabase.com/dashboard/project/xyuqcztzktqladitoell/sql/new');
    console.log('  2. Paste contents of supabase/schema.sql');
    console.log('  3. Click Run');
    console.log('\nThen run: node scripts/migrate-to-supabase.js --skip-media');
    process.exit(1);
  }

  const { Client } = require('pg');
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Schema applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
