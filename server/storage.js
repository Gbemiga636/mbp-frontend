const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseServiceKey } = require('./supabase-env');
const { optimizeImage, isImageMime } = require('./optimize-image');

const BUCKET = 'mbp';

function getClient() {
  const url = supabaseUrl();
  const key = supabaseServiceKey();
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

function publicUrl(storagePath) {
  return `${supabaseUrl()}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

function extFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('webp')) return '.webp';
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('png')) return '.png';
  if (m.includes('gif')) return '.gif';
  if (m.includes('quicktime') || m.includes('mov')) return '.mov';
  if (m.includes('mp4')) return '.mp4';
  if (m.includes('webm')) return '.webm';
  return '';
}

let bucketReady = false;

async function ensureBucket() {
  if (bucketReady) return;
  const supabase = getClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === BUCKET || b.id === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: '2MB',
    });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  bucketReady = true;
}

async function uploadBuffer(buffer, { key = '', mime = 'application/octet-stream' } = {}) {
  const kind = `${mime} ${key}`.toLowerCase();
  if (/video\/|\/(mp4|quicktime|webm)|(\.mp4|\.mov|\.webm|\.m4v)(\?|$)/i.test(kind)) {
    throw new Error('Video uploads are disabled. Films stay in /public/assets so Storage cached egress does not pile up.');
  }
  await ensureBucket();
  const supabase = getClient();

  let body = buffer;
  let contentType = mime;
  let ext = extFromMime(mime);

  if (isImageMime(mime, key)) {
    const optimized = await optimizeImage(buffer, mime);
    body = optimized.buffer;
    contentType = optimized.mime;
    ext = optimized.ext || '.webp';
  }

  const safeKey = String(key || `upload-${Date.now()}`)
    .replace(/^mbp\//i, '')
    .replace(/[^a-zA-Z0-9._/-]/g, '-')
    .replace(/^\/+/, '');
  const base = safeKey.replace(/\.[a-z0-9]+$/i, '');
  const storagePath = `catalog/${base}${ext || ''}`.replace(/\/{2,}/g, '/');

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, body, {
    contentType,
    cacheControl: '31536000, immutable',
    upsert: true,
  });
  if (error) throw error;

  return {
    url: publicUrl(storagePath),
    provider: 'supabase',
    path: storagePath,
  };
}

module.exports = { uploadBuffer, publicUrl, ensureBucket, BUCKET };
