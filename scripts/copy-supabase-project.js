// Copy mbp_kv + mbp storage from one Supabase project to another.
// Images only (skip videos) so cached egress does not pile up again.
// Usage:
//   node scripts/copy-supabase-project.js
// Env:
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY = source (current .env)
//   NEW_SUPABASE_URL / NEW_SUPABASE_SERVICE_ROLE_KEY = destination

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SRC_URL = process.env.SUPABASE_URL;
const SRC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DST_URL = process.env.NEW_SUPABASE_URL;
const DST_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
const TABLE = 'mbp_kv';
const BUCKET = 'mbp';
const SKIP_VIDEO = !process.argv.includes('--with-videos');
const DATA_ONLY = process.argv.includes('--data-only');
const DUMP_PATH = path.join(__dirname, '..', `mbp-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

if (!SRC_URL || !SRC_KEY || !DST_URL || !DST_KEY) {
  console.error('Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const src = createClient(SRC_URL, SRC_KEY, { auth: { persistSession: false } });
const dst = createClient(DST_URL, DST_KEY, { auth: { persistSession: false } });
const srcHost = new URL(SRC_URL).host;
const dstHost = new URL(DST_URL).host;

function isVideoPath(name) {
  return /\.(mp4|mov|webm|m4v|avi)$/i.test(name);
}

function rewriteValue(value) {
  if (value == null) return value;
  if (typeof value === 'string') return value.split(srcHost).join(dstHost);
  if (Array.isArray(value)) return value.map(rewriteValue);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = rewriteValue(v);
    return out;
  }
  return value;
}

async function fetchAllKv(client) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const { data, error } = await client
      .from(TABLE)
      .select('k, v, updated_at')
      .order('k', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function listAllFiles(client, prefix = '') {
  const { data, error } = await client.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw error;
  const files = [];
  for (const item of data || []) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id == null && !item.metadata) {
      files.push(...(await listAllFiles(client, full)));
    } else if (item.metadata) {
      files.push({ path: full, size: Number(item.metadata.size || 0), mime: item.metadata.mimetype || '' });
    } else {
      try {
        files.push(...(await listAllFiles(client, full)));
      } catch {
        files.push({ path: full, size: 0, mime: '' });
      }
    }
  }
  return files;
}

async function ensureBucket() {
  const { data: buckets, error } = await dst.storage.listBuckets();
  if (error) throw error;
  const exists = (buckets || []).some((b) => b.id === BUCKET || b.name === BUCKET);
  if (!exists) {
    const { error: createErr } = await dst.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: '50MB',
    });
    if (createErr && !/already exists/i.test(createErr.message)) throw createErr;
  }
}

async function copyFile(file) {
  if (SKIP_VIDEO && isVideoPath(file.path)) {
    return { skipped: true, reason: 'video' };
  }
  const { data, error } = await src.storage.from(BUCKET).download(file.path);
  if (error) throw error;
  const buf = Buffer.from(await data.arrayBuffer());
  const mime = file.mime || (isVideoPath(file.path) ? 'video/mp4' : 'image/jpeg');
  const { error: upErr } = await dst.storage.from(BUCKET).upload(file.path, buf, {
    contentType: mime,
    cacheControl: '31536000',
    upsert: true,
  });
  if (upErr) throw upErr;
  return { bytes: buf.length };
}

async function upsertRows(rows) {
  const chunk = 50;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk).map((row) => ({
      k: row.k,
      v: rewriteValue(row.v),
      updated_at: row.updated_at || new Date().toISOString(),
    }));
    const { error } = await dst.from(TABLE).upsert(slice, { onConflict: 'k' });
    if (error) throw error;
  }
}

async function main() {
  console.log(`Source: ${srcHost}`);
  console.log(`Dest:   ${dstHost}`);

  const srcRows = await fetchAllKv(src);
  console.log(`Source mbp_kv rows: ${srcRows.length}`);
  const keys = srcRows.map((r) => r.k).sort();
  console.log(`Keys: ${keys.join(', ')}`);

  const store = srcRows.find((r) => r.k === 'store');
  const products = store?.v?.products || [];
  console.log(`Products: ${products.length}`);

  fs.writeFileSync(
    DUMP_PATH,
    JSON.stringify(
      {
        version: 3,
        exportedAt: new Date().toISOString(),
        source: SRC_URL,
        dest: DST_URL,
        rows: srcRows,
      },
      null,
      2
    )
  );
  console.log(`Backup written: ${path.basename(DUMP_PATH)}`);

  const destProbe = await dst.from(TABLE).select('k').limit(1);
  if (destProbe.error) {
    console.error('\nDESTINATION TABLE MISSING.');
    console.error(destProbe.error.message);
    console.error('Paste supabase/schema.sql into the new project SQL editor, then re-run this script.');
    process.exit(2);
  }

  await upsertRows(srcRows);
  const destRows = await fetchAllKv(dst);
  console.log(`Destination mbp_kv rows: ${destRows.length}`);
  if (destRows.length < srcRows.length) {
    throw new Error(`Row count mismatch: src ${srcRows.length} dest ${destRows.length}`);
  }

  if (DATA_ONLY) {
    console.log('Skipped storage copy (--data-only).');
    return;
  }

  await ensureBucket();
  let files = [];
  try {
    files = await listAllFiles(src);
  } catch (e) {
    console.warn(`Could not list source storage: ${e.message || e}`);
  }
  console.log(`Source storage files: ${files.length}`);

  let copied = 0;
  let skipped = 0;
  let failed = 0;
  for (const file of files) {
    try {
      const out = await copyFile(file);
      if (out.skipped) {
        skipped += 1;
        console.log(`skip ${file.path} (${out.reason})`);
      } else {
        copied += 1;
        console.log(`copy ${file.path} ${out.bytes}b`);
      }
    } catch (e) {
      failed += 1;
      console.warn(`fail ${file.path}: ${e.message || e}`);
    }
  }
  console.log(`Storage copy done. copied=${copied} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => {
  console.error('Migration failed:', e.message || e);
  process.exit(1);
});
