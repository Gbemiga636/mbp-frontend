// Quick pre-push / post-deploy check.
// Usage: node scripts/verify-deploy.js
//        node scripts/verify-deploy.js https://mbp-frontend.netlify.app

require('dotenv').config();

const base = (process.argv[2] || process.env.PUBLIC_SITE_URL || 'http://localhost:4000').replace(/\/$/, '');

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'JWT_SECRET',
  'PAYSTACK_SECRET_KEY',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
];

async function checkEnv() {
  const missing = requiredEnv.filter((k) => !String(process.env[k] || '').trim());
  if (missing.length) {
    console.log('Local .env missing:', missing.join(', '));
    console.log('(On Netlify, set these in Site settings → Environment variables)\n');
  } else {
    console.log('Local .env: all required keys present\n');
  }
}

async function checkUrl(path) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
    const ok = res.ok;
    console.log(`${ok ? 'OK' : 'FAIL'} ${res.status} ${url}`);
    return ok;
  } catch (e) {
    console.log(`FAIL ${url} — ${e.message}`);
    return false;
  }
}

async function main() {
  console.log(`MBP deploy check — ${base}\n`);
  await checkEnv();
  await checkUrl('/api/health');
  await checkUrl('/api/config');
  await checkUrl('/api/content/store');
  console.log('\nIf all OK, storefront + API are wired correctly.');
}

main();
