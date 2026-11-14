require('dotenv').config();
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SRC_URL = process.env.SRC_URL || 'https://xyuqcztzktqladitoell.supabase.co';
const SRC_KEY = process.env.SRC_KEY || '';
const DST_URL = process.env.NEW_SUPABASE_URL;
const DST_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
const BACKUP_PATH = path.join(__dirname, '..', 'mbp-backup-2026-07-09T12-19-54-300Z.json');
const MEDIA_DIR = path.join(__dirname, '..', 'mbp-backup-media-2026-07-09T12-19-54-319Z');
const SEED_PATH = path.join(__dirname, '..', 'server', 'seed-kv.json');
const TABLE = 'mbp_kv';
const BUCKET = 'mbp';
const DATA_BUCKET = 'mbp-data';
const CONCURRENCY = 4;
const DATA_ONLY = process.argv.includes('--data-only');

if (!DST_URL || !DST_KEY) {
  console.error('Missing NEW_SUPABASE_URL / NEW_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const dst = createClient(DST_URL, DST_KEY, { auth: { persistSession: false } });
const urlMap = new Map();

function isVideo(url) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(url || ''));
}

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

function snapshotFromRows(rows) {
  const snap = {};
  for (const row of rows) snap[row.k] = row.v;
  return snap;
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
    if (isVideo(value) && /supabase\.co/i.test(value)) return '';
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
    const files = fs.existsSync(MEDIA_DIR) ? fs.readdirSync(MEDIA_DIR) : [];
    const match = files.find((f) => f.includes(base) || f.endsWith(base));
    return match ? path.join(MEDIA_DIR, match) : null;
  } catch {
    return null;
  }
}

async function mapPool(items, limit, worker) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i;
      i += 1;
      await worker(items[idx], idx);
    }
  }));
}

async function tryDumpSrc() {
  if (!SRC_KEY) return null;
  const src = createClient(SRC_URL, SRC_KEY, { auth: { persistSession: false } });
  try {
    const { data, error } = await src.from(TABLE).select('k, v, updated_at').order('k');
    if (error) {
      console.log('Source KV not ready:', error.message.slice(0, 120));
      return null;
    }
    console.log(`Live source keys: ${(data || []).length}`);
    return snapshotFromRows(data || []);
  } catch (e) {
    console.log('Source unreachable:', e.cause?.code || e.message);
    return null;
  }
}

function loadFallbackSnapshot() {
  if (fs.existsSync(SEED_PATH)) {
    const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
    const products = seed.store?.products?.length || 0;
    if (products) {
      console.log(`Using seed fallback (${products} products)`);
      return seed;
    }
  }
  const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  console.log(`Using July backup (${backup.store?.products?.length || 0} products)`);
  return {
    home: backup.home,
    store: backup.store,
    gallery: backup.gallery,
    settings: backup.settings || { deliveryFee: 0 },
    orders: backup.orders || [],
    orderStatus: backup.orderStatus || {},
    processed: backup.processed || [],
    promotions: [],
    content: { home: backup.home, store: backup.store, gallery: backup.gallery },
  };
}

async function ensureBuckets() {
  const { data: buckets, error } = await dst.storage.listBuckets();
  if (error) throw error;
  const names = (buckets || []).map((b) => b.name);
  if (!names.includes(BUCKET)) {
    const { error: e } = await dst.storage.createBucket(BUCKET, { public: true, fileSizeLimit: '50MB' });
    if (e && !/already exists/i.test(e.message)) throw e;
  }
  if (!names.includes(DATA_BUCKET)) {
    const { error: e } = await dst.storage.createBucket(DATA_BUCKET, { public: false, fileSizeLimit: '20MB' });
    if (e && !/already exists/i.test(e.message)) throw e;
  }
}

async function uploadImages(urls) {
  let ok = 0;
  let skipped = 0;
  let kept = 0;
  await mapPool(urls, CONCURRENCY, async (url) => {
    if (isVideo(url)) {
      skipped += 1;
      urlMap.set(url, /supabase\.co/i.test(url) ? '' : url);
      return;
    }
    const local = findLocalFile(url);
    if (!local) {
      kept += 1;
      return;
    }
    const buf = fs.readFileSync(local);
    const base = path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `migrated/${base}`;
    const { error } = await dst.storage.from(BUCKET).upload(storagePath, buf, {
      contentType: guessMime(local, buf),
      cacheControl: '31536000',
      upsert: true,
    });
    if (error) {
      console.warn('image fail', base, error.message);
      kept += 1;
      return;
    }
    urlMap.set(url, publicUrl(storagePath));
    ok += 1;
    if (ok % 25 === 0) console.log(`  images ${ok}`);
  });
  console.log(`Images uploaded=${ok} skipped_videos=${skipped} kept_remote=${kept}`);
}

async function writeKv(snapshot) {
  const probe = await dst.from(TABLE).select('k').limit(1);
  if (probe.error) {
    console.log('mbp_kv table missing — site will use bundled seed. Paste supabase/schema.sql then re-run.');
    console.log(probe.error.message);
    return;
  }
  for (const [k, v] of Object.entries(snapshot)) {
    const { error } = await dst.from(TABLE).upsert(
      { k, v: v ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'k' }
    );
    if (error) throw error;
    console.log('wrote', k);
  }
}

async function main() {
  console.log('Dest', DST_URL);
  let snapshot = await tryDumpSrc();
  if (!snapshot || !(snapshot.store?.products || []).length) snapshot = loadFallbackSnapshot();
  const products = snapshot.store?.products?.length || 0;
  console.log('Migrating products:', products);
  if (!products) throw new Error('No products found to migrate');

  if (DATA_ONLY) {
    console.log('Skipping media copy (--data-only); keeping existing image URLs');
  } else {
    await ensureBuckets();
    const urls = [...collectUrls(snapshot)].sort();
    console.log('Media URLs', urls.length);
    await uploadImages(urls);
  }

  const migrated = replaceUrls(snapshot);
  if (!migrated.promotions) migrated.promotions = [];
  migrated.content = {
    home: migrated.home,
    store: migrated.store,
    gallery: migrated.gallery,
  };

  await writeKv(migrated);

  const seed = {
    home: migrated.home,
    store: migrated.store,
    gallery: migrated.gallery,
    settings: migrated.settings || { deliveryFee: 0 },
    promotions: migrated.promotions || [],
    content: migrated.content,
  };
  fs.writeFileSync(SEED_PATH, JSON.stringify(seed));
  console.log('seed-kv.json updated');
  console.log('DONE products', migrated.store?.products?.length || 0);
}

main().catch((e) => {
  console.error('MIGRATE_FAIL', e.message || e);
  process.exit(1);
});
