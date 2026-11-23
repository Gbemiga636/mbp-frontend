// Compress local/July product photos and upload them to the active MBP Supabase bucket.
// Does not delete or rewrite product rows. Revive swaps URLs at read time.
const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // older Node
}

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseServiceKey } = require('../server/supabase-env');
const { uploadBuffer, ensureBucket, publicUrl } = require('../server/storage');

async function listCatalogNames() {
  const client = createClient(supabaseUrl(), supabaseServiceKey(), { auth: { persistSession: false } });
  const names = new Set();
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage.from('mbp').list('catalog', { limit: 1000, offset });
    if (error) {
      if (/not found|does not exist/i.test(error.message || '')) return names;
      throw error;
    }
    if (!data?.length) break;
    for (const f of data) if (f.name) names.add(f.name);
    if (data.length < 1000) break;
    offset += data.length;
  }
  return names;
}

const ROOT = path.join(__dirname, '..');
const LOCAL = path.join(ROOT, 'public', 'product-media');
const JULY_MEDIA = path.join(ROOT, 'mbp-backup-media-2026-07-09T12-19-54-319Z');
const JULY_JSON = path.join(ROOT, 'mbp-backup-2026-07-09T12-19-54-300Z.json');
const ARCHIVE = path.join(ROOT, 'server', 'image-archive.json');

function listLocal() {
  if (!fs.existsSync(LOCAL)) return [];
  return fs.readdirSync(LOCAL).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
}

function parseLocalName(file) {
  const m = file.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(-back|-g\d+)?\.(jpe?g|png|webp)$/i);
  if (!m) return null;
  return { id: m[1], slot: m[2] || '', file };
}

async function uploadFile(abs, key) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const raw = fs.readFileSync(abs);
      return await uploadBuffer(raw, { key, mime: 'image/jpeg' });
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw lastErr;
}

async function main() {
  if (!process.env.MBP_SUPABASE_URL && !process.env.SUPABASE_URL) {
    throw new Error('MBP_SUPABASE_URL is missing');
  }
  await ensureBucket();

  const byId = {};
  function slotFor(id) {
    if (!byId[id]) byId[id] = { image: '', imageBack: '', images: [] };
    return byId[id];
  }

  const localFiles = listLocal().map(parseLocalName).filter(Boolean);
  const existing = await listCatalogNames();
  console.log('local product photos', localFiles.length, 'already in bucket', existing.size);

  function applyUrl(id, slot, url) {
    const rec = slotFor(id);
    if (slot === '-back') rec.imageBack = url;
    else if (String(slot).startsWith('-g')) rec.images.push(url);
    else rec.image = url;
  }

  const queue = [...localFiles];
  let i = 0;
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      const key = item.slot ? `${item.id}${item.slot}` : item.id;
      const dest = `${key}.webp`;
      if (existing.has(dest)) {
        applyUrl(item.id, item.slot, publicUrl(`catalog/${dest}`));
        i += 1;
        continue;
      }
      const out = await uploadFile(path.join(LOCAL, item.file), key);
      applyUrl(item.id, item.slot, out.url);
      existing.add(dest);
      i += 1;
      if (i % 25 === 0) {
        console.log('processed', i, '/', localFiles.length);
        fs.writeFileSync(ARCHIVE, JSON.stringify(byId));
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  if (fs.existsSync(JULY_JSON) && fs.existsSync(JULY_MEDIA)) {
    const july = JSON.parse(fs.readFileSync(JULY_JSON, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(path.join(JULY_MEDIA, 'media-manifest.json'), 'utf8'));
    const byUrl = new Map(manifest.filter((m) => m.status === 'ok' && m.file).map((m) => [m.url, m.file]));
    for (const p of july.home?.featured || []) {
      const file = byUrl.get(p.image);
      if (!file) continue;
      const abs = path.join(JULY_MEDIA, file);
      if (!fs.existsSync(abs)) continue;
      const dest = `${p.id}.webp`;
      if (existing.has(dest)) {
        slotFor(p.id).image = publicUrl(`catalog/${dest}`);
        console.log('featured exists', p.id);
        continue;
      }
      const out = await uploadFile(abs, p.id);
      slotFor(p.id).image = out.url;
      existing.add(dest);
      console.log('featured', p.id);
    }
  }

  fs.writeFileSync(ARCHIVE, JSON.stringify(byId));
  const sample = Object.values(byId).find((v) => v.image);
  console.log('archived ids', Object.keys(byId).length);
  console.log('sample', sample && sample.image);
  console.log('public pattern', publicUrl('catalog/example.webp'));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
