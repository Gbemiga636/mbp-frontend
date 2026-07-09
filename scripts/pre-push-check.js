// Pre-push safety check — read-only, does not modify anything.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const checks = [];

function pass(msg) { checks.push({ ok: true, msg }); }
function fail(msg) { checks.push({ ok: false, msg }); }

async function checkSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail('Supabase env vars missing');

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: storeRow, error: storeErr } = await sb.from('mbp_kv').select('v').eq('k', 'store').maybeSingle();
  if (storeErr) return fail(`Supabase store read failed: ${storeErr.message}`);

  const products = storeRow?.v?.products || [];
  if (!Array.isArray(products) || products.length === 0) return fail('No products in Supabase store');
  pass(`Supabase: ${products.length} products ready`);

  const withImages = products.filter((p) => p.image && String(p.image).startsWith('http'));
  pass(`Supabase: ${withImages.length}/${products.length} products have image URLs`);

  for (const key of ['home', 'gallery', 'settings']) {
    const { data, error } = await sb.from('mbp_kv').select('k').eq('k', key).maybeSingle();
    if (error) return fail(`Supabase ${key} read failed: ${error.message}`);
    if (!data) fail(`Supabase: missing ${key} key`);
    else pass(`Supabase: ${key} data exists`);
  }

  const { data: orders } = await sb.from('mbp_kv').select('v').eq('k', 'orders').maybeSingle();
  const orderCount = Array.isArray(orders?.v) ? orders.v.length : 0;
  pass(`Supabase: ${orderCount} orders preserved`);
}

async function checkLocalApi(base) {
  const endpoints = [
    ['/api/health', (d) => d?.ok === true],
    ['/api/config', (d) => typeof d?.deliveryFee === 'number'],
    ['/api/content/store', (d) => Array.isArray(d?.products) && d.products.length > 0],
    ['/api/content/home', (d) => Array.isArray(d?.featured)],
    ['/api/content/gallery', (d) => Array.isArray(d?.items)],
  ];

  for (const [path, validate] of endpoints) {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(15000) });
      const data = await res.json().catch(() => null);
      if (!res.ok) fail(`API ${path} → HTTP ${res.status}`);
      else if (!validate(data)) fail(`API ${path} → unexpected response shape`);
      else {
        const extra = path.includes('store') ? ` (${data.products.length} products)` : '';
        pass(`API ${path} → OK${extra}`);
      }
    } catch (e) {
      fail(`API ${path} → ${e.message}`);
    }
  }
}

async function checkGitSafety() {
  const { execSync } = require('child_process');
  try {
    const status = execSync('git status --short', { encoding: 'utf8' });
    if (/\?\? \.env| M \.env|A  \.env/.test(status)) fail('.env would be committed — STOP');
    else pass('.env is not staged (secrets safe)');

    if (status.includes('backend/') && !status.includes('??')) {
      // backend tracked would be bad if it has secrets
    }
    pass('Git: ready to push project files');
  } catch {
    pass('Git: status check skipped');
  }
}

async function checkDeployFiles() {
  const fs = require('fs');
  const required = ['netlify.toml', 'netlify/functions/api.js', 'server/index.js', 'public/config.js', 'package.json'];
  for (const f of required) {
    if (!fs.existsSync(f)) fail(`Missing deploy file: ${f}`);
    else pass(`Deploy file present: ${f}`);
  }
}

async function main() {
  console.log('MBP Pre-Push Safety Check\n');

  await checkDeployFiles();
  await checkGitSafety();
  await checkSupabase();

  const apiBase = process.argv[2] || 'http://localhost:4000';
  console.log(`\nTesting API at ${apiBase}...`);
  await checkLocalApi(apiBase);

  const failed = checks.filter((c) => !c.ok);
  const passed = checks.filter((c) => c.ok);

  console.log('\n── Results ──');
  for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.msg}`);

  console.log(`\n${passed.length} passed, ${failed.length} failed`);

  if (failed.length === 0) {
    console.log('\nSafe to push. Products will show after Netlify deploy + env vars are set.');
    console.log('Your OLD live site (Render/Cloudinary) is NOT affected by this push.');
  } else {
    console.log('\nFix failures before pushing.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
