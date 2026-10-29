// Restore the local July snapshot into the new shared Supabase project.
// Images only (skip videos) so cached egress does not pile up again.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DST_URL = process.env.NEW_SUPABASE_URL || process.env.SUPABASE_URL;
const DST_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKUP_PATH = process.env.BACKUP_PATH || path.join(__dirname, '..', 'mbp-backup-2026-07-09T12-19-54-300Z.json');
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(__dirname, '..', 'mbp-backup-media-2026-07-09T12-19-54-319Z');
const DATA_ONLY = process.argv.includes('--data-only');
const MEDIA_ONLY = process.argv.includes('--media-only');
const BUCKET = 'mbp';
const CONCURRENCY = 4;

if (!DST_URL || !DST_KEY) {
  console.error('Missing NEW_SUPABASE_URL / NEW_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(DST_URL, DST_KEY, { auth: { persistSession: false } });
const urlMap = new Map();

function publicUrl(storagePath) {
  return `${DST_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

function guessMime(file, buf) {
  const u = String(file || '').toLowerCase();
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.gif')) return 'image/gif';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  if (buf?.[0] === 0xff && buf?.[1] === 0xd8) return 'image/jpeg';
  return 'application/octet-stream';
}

function isVideoUrl(url) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(url || ''));
}

function collectUrls(value, urls = new Set()) {
  if (value == null) return urls;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value) && /cloudinary\.com|supabase\.co|\.(jpg|jpeg|png|gif|webp|mov|mp4)/i.test(value)) {
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
    if (isVideoUrl(value)) return '';
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
  const manifestPath = path.join(MEDIA_DIR, 'media-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const hit = manifest.find((m) => m.url === url && m.status === 'ok');
    if (hit?.file) {
      const p = path.join(MEDIA_DIR, hit.file);
      if (fs.existsSync(p)) return p;
    }
  }
  try {
    const base = path.basename(new URL(url).pathname);
    const files = fs.readdirSync(MEDIA_DIR);
    const match = files.find((f) => f.includes(base) || f.endsWith(base));
    return match ? path.join(MEDIA_DIR, match) : null;
  } catch {
    return null;
  }
}

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (!(buckets || []).some((b) => b.id === BUCKET || b.name === BUCKET)) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: '50MB',
    });
    if (createErr && !/already exists/i.test(createErr.message)) throw createErr;
  }
}

async function mapPool(items, limit, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i;
      i += 1;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

async function uploadMedia(urls) {
  await ensureBucket();
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  await mapPool(urls, CONCURRENCY, async (url, idx) => {
    if (isVideoUrl(url)) {
      skipped += 1;
      urlMap.set(url, '');
      return;
    }
    const local = findLocalFile(url);
    if (!local) {
      failed += 1;
      console.warn(`missing ${url}`);
      return;
    }
    const buf = fs.readFileSync(local);
    const base = path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `migrated/${base}`;
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
      contentType: guessMime(local, buf),
      cacheControl: '31536000',
      upsert: true,
    });
    if (error) {
      failed += 1;
      console.warn(`fail ${base}: ${error.message}`);
      return;
    }
    urlMap.set(url, publicUrl(storagePath));
    ok += 1;
    if (ok % 25 === 0 || idx === urls.length - 1) {
      console.log(`  uploaded ${ok}/${urls.length - skipped} images`);
    }
  });
  console.log(`Media done. uploaded=${ok} skipped_videos=${skipped} failed=${failed}`);
}

async function upsertKv(key, value) {
  const { error } = await supabase.from('mbp_kv').upsert(
    { k: key, v: value ?? null, updated_at: new Date().toISOString() },
    { onConflict: 'k' }
  );
  if (error) throw error;
}

async function main() {
  console.log(`Dest ${DST_URL}`);
  const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  const urls = [...collectUrls(backup)].sort();
  console.log(`Backup products: ${backup.store?.products?.length || 0}`);
  console.log(`Media URLs: ${urls.length}`);

  if (!DATA_ONLY) await uploadMedia(urls);

  if (MEDIA_ONLY) return;

  const migrated = replaceUrls({
    home: backup.home,
    store: backup.store,
    gallery: backup.gallery,
    settings: backup.settings || { deliveryFee: 0 },
    orders: backup.orders || [],
    orderStatus: backup.orderStatus || backup['order-status'] || {},
    processed: backup.processed || [],
  });
  migrated.promotions = [];

  const probe = await supabase.from('mbp_kv').select('k').limit(1);
  if (probe.error) {
    console.error('\nTABLE MISSING:', probe.error.message);
    console.error('Paste supabase/schema.sql in the new project SQL editor, then re-run:');
    console.error('  node scripts/restore-backup-to-new.js --data-only');
    process.exit(2);
  }

  await upsertKv('home', migrated.home);
  await upsertKv('store', migrated.store);
  await upsertKv('gallery', migrated.gallery);
  await upsertKv('settings', migrated.settings);
  await upsertKv('orders', migrated.orders);
  await upsertKv('orderStatus', migrated.orderStatus);
  await upsertKv('processed', migrated.processed);
  await upsertKv('promotions', migrated.promotions);
  await upsertKv('content', {
    home: migrated.home,
    store: migrated.store,
    gallery: migrated.gallery,
  });

  console.log('KV restore complete');
  console.log(`  Products: ${migrated.store?.products?.length || 0}`);
  console.log(`  Gallery:  ${migrated.gallery?.items?.length || 0}`);
  console.log(`  Featured: ${migrated.home?.featured?.length || 0}`);
  console.log(`  Orders:   ${(migrated.orders || []).length}`);
}

main().catch((e) => {
  console.error('Restore failed:', e.message || e);
  process.exit(1);
});
