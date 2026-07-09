// Upload homepage / gallery videos to Supabase Storage and update mbp_kv.
// Usage: node scripts/upload-site-videos.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'mbp';
const ASSETS = path.join(__dirname, '..', 'public', 'assets');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    lib.get(url, { timeout: 180000 }, (res) => {
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

function publicUrl(storagePath) {
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function uploadFile(localPath, storagePath, mime) {
  const buf = fs.readFileSync(localPath);
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw error;
  return publicUrl(storagePath);
}

async function ensureHeroVideo(home) {
  const current = String(home.heroVideo || '').trim();
  if (current.includes('supabase.co/storage')) {
    console.log('Hero video already on Supabase:', current);
    return current;
  }

  const cloudUrl = current || 'https://res.cloudinary.com/dw4fuxc5l/video/upload/v1768120231/mbp/home-hero-video.mov';
  console.log('Uploading hero video from', cloudUrl);
  const buf = await fetchBuffer(cloudUrl);
  const url = publicUrl('videos/home-hero-video.mov');
  const { error } = await supabase.storage.from(BUCKET).upload('videos/home-hero-video.mov', buf, {
    contentType: 'video/quicktime',
    upsert: true,
  });
  if (error) throw error;
  console.log('Hero video uploaded:', url);
  return url;
}

async function main() {
  const videos = [
    { file: 'mbpvid1.mp4', storage: 'videos/mbpvid1.mp4', mime: 'video/mp4', key: 'bandVideo' },
    { file: 'mbpvid2.mp4', storage: 'videos/mbpvid2.mp4', mime: 'video/mp4', key: 'preloadVideo' },
  ];

  const { data: row, error: readErr } = await supabase.from('mbp_kv').select('v').eq('k', 'home').maybeSingle();
  if (readErr) throw readErr;
  const home = row?.v || { heroVideo: '', featured: [], reviews: [] };

  home.heroVideo = await ensureHeroVideo(home);

  for (const v of videos) {
    const local = path.join(ASSETS, v.file);
    if (!fs.existsSync(local)) throw new Error(`Missing ${local}`);
    console.log(`Uploading ${v.file}...`);
    home[v.key] = await uploadFile(local, v.storage, v.mime);
    console.log(`  → ${home[v.key]}`);
  }

  const { error: homeErr } = await supabase.from('mbp_kv').upsert({
    k: 'home',
    v: home,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'k' });
  if (homeErr) throw homeErr;

  const { data: galleryRow, error: galReadErr } = await supabase.from('mbp_kv').select('v').eq('k', 'gallery').maybeSingle();
  if (galReadErr) throw galReadErr;
  const gallery = galleryRow?.v || { items: [] };
  const map = { 'mbpvid1.mp4': home.bandVideo, 'mbpvid2.mp4': home.preloadVideo };

  gallery.items = (gallery.items || []).map((item) => {
    const src = String(item?.src || '');
    const base = path.basename(src);
    if (map[base]) return { ...item, src: map[base] };
    return item;
  });

  const { error: galErr } = await supabase.from('mbp_kv').upsert({
    k: 'gallery',
    v: gallery,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'k' });
  if (galErr) throw galErr;

  const content = { home, store: null, gallery };
  const { data: contentRow } = await supabase.from('mbp_kv').select('v').eq('k', 'content').maybeSingle();
  const existing = contentRow?.v || {};
  const { data: storeRow } = await supabase.from('mbp_kv').select('v').eq('k', 'store').maybeSingle();
  content.store = storeRow?.v || existing.store || { products: [] };

  await supabase.from('mbp_kv').upsert({
    k: 'content',
    v: { home, store: content.store, gallery },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'k' });

  console.log('\nDone. Videos are now in Supabase and saved to the database.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
