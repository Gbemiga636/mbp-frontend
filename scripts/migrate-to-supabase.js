// Migrate MBP backup JSON + media to Supabase (database + storage).
// Prerequisites:
//   1. Run supabase/schema.sql in Supabase SQL Editor
//   2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
//
// Usage:
//   node scripts/migrate-to-supabase.js
//   node scripts/migrate-to-supabase.js --skip-media   (data only, keep Cloudinary URLs)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKUP_PATH = process.env.BACKUP_PATH || path.join(__dirname, '..', 'mbp-backup-2026-07-09T12-19-54-300Z.json');
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(__dirname, '..', 'mbp-backup-media-2026-07-09T12-19-54-319Z');
const SKIP_MEDIA = process.argv.includes('--skip-media');
const BUCKET = 'mbp';
const URL_MAP_PATH = path.join(__dirname, '..', 'scripts', '.url-map-cache.json');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const urlMap = new Map();

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    lib.get(url, { timeout: 120000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuffer(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function guessMime(url, buf) {
  const u = String(url).toLowerCase();
  if (u.includes('.png')) return 'image/png';
  if (u.includes('.webp')) return 'image/webp';
  if (u.includes('.gif')) return 'image/gif';
  if (u.includes('.mov')) return 'video/quicktime';
  if (u.includes('.mp4')) return 'video/mp4';
  if (u.includes('.webm')) return 'video/webm';
  if (u.includes('.jpg') || u.includes('.jpeg')) return 'image/jpeg';
  if (buf?.[0] === 0xff && buf?.[1] === 0xd8) return 'image/jpeg';
  return 'application/octet-stream';
}

function publicUrl(storagePath) {
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!(buckets || []).some((b) => b.id === BUCKET || b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
}

function collectUrls(value, urls = new Set()) {
  if (value == null) return urls;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value) && /cloudinary\.com|\.(jpg|jpeg|png|gif|webp|mov|mp4)/i.test(value)) {
      urls.add(value);
    }
    return urls;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectUrls(v, urls);
    return urls;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) collectUrls(v, urls);
  }
  return urls;
}

function replaceUrls(value) {
  if (value == null) return value;
  if (typeof value === 'string') {
    return urlMap.get(value) || value;
  }
  if (Array.isArray(value)) return value.map(replaceUrls);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = replaceUrls(v);
    return out;
  }
  return value;
}

function findLocalFile(url) {
  if (!fs.existsSync(MEDIA_DIR)) return null;
  const manifestPath = path.join(MEDIA_DIR, 'media-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const hit = manifest.find((m) => m.url === url && m.status === 'ok');
    if (hit?.file) {
      const p = path.join(MEDIA_DIR, hit.file);
      if (fs.existsSync(p)) return p;
    }
  }
  const base = path.basename(new URL(url).pathname);
  const files = fs.readdirSync(MEDIA_DIR);
  const match = files.find((f) => f.includes(base) || f.endsWith(base));
  return match ? path.join(MEDIA_DIR, match) : null;
}

async function uploadUrl(url, index, total) {
  if (urlMap.has(url)) return urlMap.get(url);

  let buf;
  const local = findLocalFile(url);
  if (local) {
    buf = fs.readFileSync(local);
  } else {
    process.stdout.write(`  downloading ${index}/${total} ... `);
    buf = await fetchBuffer(url);
    process.stdout.write('ok\n');
  }

  const base = path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `migrated/${base}`;
  const mime = guessMime(url, buf);

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw error;

  const mapped = publicUrl(storagePath);
  urlMap.set(url, mapped);
  return mapped;
}

async function upsertKv(key, value) {
  const { error } = await supabase.from('mbp_kv').upsert({
    k: key,
    v: value,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'k' });
  if (error) throw error;
}

async function main() {
  console.log('MBP → Supabase migration\n');
  if (!fs.existsSync(BACKUP_PATH)) throw new Error(`Backup not found: ${BACKUP_PATH}`);

  const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  await ensureBucket();

  if (!SKIP_MEDIA) {
    const urls = [...collectUrls(backup)].sort();
    console.log(`Uploading ${urls.length} media files to Supabase Storage...`);
    let i = 0;
    for (const url of urls) {
      i += 1;
      try {
        const localFile = findLocalFile(url);
        if (localFile) {
          process.stdout.write(`  [${i}/${urls.length}] ${path.basename(localFile)} ... `);
        }
        await uploadUrl(url, i, urls.length);
        if (localFile) process.stdout.write('OK\n');
      } catch (e) {
        console.warn(`\n  WARN: failed ${url}: ${e.message}`);
      }
    }
    fs.writeFileSync(URL_MAP_PATH, JSON.stringify(Object.fromEntries(urlMap), null, 2));
    console.log(`Mapped ${urlMap.size} URLs to Supabase Storage\n`);
  } else {
    const urls = [...collectUrls(backup)].sort();
    for (const url of urls) {
      const base = path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]/g, '_');
      urlMap.set(url, publicUrl(`migrated/${base}`));
    }
    console.log(`Rebuilt ${urlMap.size} URL mappings for Supabase Storage paths\n`);
  }

  const migrated = replaceUrls({
    home: backup.home,
    store: backup.store,
    gallery: backup.gallery,
    settings: backup.settings || { deliveryFee: 0 },
    orders: backup.orders || [],
    orderStatus: backup.orderStatus || {},
    processed: backup.processed || [],
  });

  console.log('Writing database records...');
  await upsertKv('home', migrated.home);
  await upsertKv('store', migrated.store);
  await upsertKv('gallery', migrated.gallery);
  await upsertKv('settings', migrated.settings);
  await upsertKv('orders', migrated.orders);
  await upsertKv('orderStatus', migrated.orderStatus);
  await upsertKv('processed', migrated.processed);
  await upsertKv('content', {
    home: migrated.home,
    store: migrated.store,
    gallery: migrated.gallery,
  });

  const products = migrated.store?.products?.length || 0;
  const gallery = migrated.gallery?.items?.length || 0;
  const featured = migrated.home?.featured?.length || 0;
  console.log('\nMigration complete:');
  console.log(`  Products:  ${products}`);
  console.log(`  Gallery:   ${gallery}`);
  console.log(`  Featured:  ${featured}`);
  console.log(`  Orders:    ${(migrated.orders || []).length}`);
}

main().catch((e) => {
  console.error('\nMigration failed:', e.message || e);
  process.exit(1);
});
