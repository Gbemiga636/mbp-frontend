const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'mbp';

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

function publicUrl(storagePath) {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

function extFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('png')) return '.png';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  if (m.includes('quicktime') || m.includes('mov')) return '.mov';
  if (m.includes('mp4')) return '.mp4';
  if (m.includes('webm')) return '.webm';
  return '';
}

async function ensureBucket() {
  const supabase = getClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === BUCKET || b.id === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
}

async function uploadBuffer(buffer, { key = '', mime = 'application/octet-stream' } = {}) {
  await ensureBucket();
  const supabase = getClient();
  const safeKey = String(key || `upload-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '-');
  const ext = extFromMime(mime) || path.extname(safeKey) || '';
  const storagePath = `${safeKey}${ext && !safeKey.endsWith(ext) ? ext : ''}`.replace(/^\/+/, '');

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw error;

  return {
    url: publicUrl(storagePath),
    provider: 'supabase',
    path: storagePath,
  };
}

module.exports = { uploadBuffer, publicUrl, ensureBucket };
