// Restore the local July snapshot into the destination Supabase project.
// Images come from the local media folder (no old-project download).
// Videos are skipped so cached egress does not pile up again.
//
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY should already point at the NEW project,
// or pass NEW_SUPABASE_URL / NEW_SUPABASE_SERVICE_ROLE_KEY.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEW_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKUP_PATH = process.env.BACKUP_PATH || path.join(__dirname, '..', 'mbp-backup-2026-07-09T12-19-54-300Z.json');
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(__dirname, '..', 'mbp-backup-media-2026-07-09T12-19-54-319Z');
const MEDIA_ONLY = process.argv.includes('--media-only');
const DATA_ONLY = process.argv.includes('--data-only');
const BUCKET = 'mbp';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing destination Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const urlMap = new Map();

function isVideo(url) {
  return /\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(String(url || ''));
}

function guessMime(url) {
  const u = String(url).toLowerCase();
  if (u.includes('.png')) return 'image/png';
  if (u.includes('.webp')) return 'image/webp';
  if (u.includes('.gif')) return 'image/gif';
  if (u.includes('.jpg') || u.includes('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

function publicUrl(storagePath) {
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

function collectUrls(value, urls = new Set()) {
  if (value == null) return urls;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value) && /cloudinary\.com|supabase\.co|\.(jpg|jpeg|png|gif|webp)$/i.test(value) && !isVideo(value)) {
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
  if (typeof value === 'string') return urlMap.get(value) || value;
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

async function uploadLocal(url, index, total) {
  if (urlMap.has(url)) return urlMap.get(url);
  const local = findLocalFile(url);
  if (!local) {
    console.warn(`  missing local file for ${url}`);
    return url;
  }
  const base = path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `migrated/${base}`;
  const buf = fs.readFileSync(local);
  process.stdout.write(`  [${index}/${total}] ${base} ... `);
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: guessMime(url),
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) throw error;
  const mapped = publicUrl(storagePath);
  urlMap.set(url, mapped);
  console.log('OK');
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
  console.log(`Dest ${SUPABASE_URL}`);
  if (!fs.existsSync(BACKUP_PATH)) throw new Error(`Backup not found: ${BACKUP_PATH}`);
  const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  await ensureBucket();
  console.log('Bucket mbp ready');

  const urls = [...collectUrls(backup)].sort();
  if (!DATA_ONLY) {
    console.log(`Uploading ${urls.length} images from local backup...`);
    let i = 0;
    for (const url of urls) {
      i += 1;
      try {
        await uploadLocal(url, i, urls.length);
      } catch (e) {
        console.warn(`\n  WARN: ${e.message || e}`);
      }
    }
    console.log(`Mapped ${urlMap.size} image URLs`);
  } else {
    for (const url of urls) {
      const base = path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]/g, '_');
      urlMap.set(url, publicUrl(`migrated/${base}`));
    }
  }

  if (MEDIA_ONLY) {
    console.log('Stopped after media (--media-only).');
    return;
  }

  const migrated = replaceUrls({
    home: backup.home,
    store: backup.store,
    gallery: backup.gallery,
    settings: backup.settings || { deliveryFee: 0 },
    orders: backup.orders || [],
    orderStatus: backup.orderStatus || backup['order-status'] || {},
    processed: backup.processed || [],
    promotions: backup.promotions || [],
  });

  try {
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
  } catch (e) {
    console.error('\nDatabase write failed:', e.message || e);
    console.error('Paste supabase/schema.sql into the new project SQL editor, then re-run:');
    console.error('  node scripts/restore-from-local-backup.js --data-only');
    process.exit(2);
  }

  console.log('\nRestore complete:');
  console.log(`  Products: ${(migrated.store?.products || []).length}`);
  console.log(`  Gallery:  ${(migrated.gallery?.items || []).length}`);
  console.log(`  Featured: ${(migrated.home?.featured || []).length}`);
  console.log(`  Orders:   ${(migrated.orders || []).length}`);
}

main().catch((e) => {
  console.error('Restore failed:', e.message || e);
  process.exit(1);
});
