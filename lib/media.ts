const DEAD_STORAGE = /xyuqcztzktqladitoell\.supabase\.co\/storage/i;
const CLOUDINARY = 'https://res.cloudinary.com/dw4fuxc5l';

export function isDeadStorage(src?: string | null) {
  return DEAD_STORAGE.test(String(src || ''));
}

export function isSupabaseStorage(src?: string | null) {
  return /supabase\.co\/storage/i.test(String(src || ''));
}

function fileNameOf(src: string) {
  try {
    return decodeURIComponent(new URL(src).pathname.split('/').pop() || '');
  } catch {
    const clean = String(src || '').split('?')[0];
    return clean.split('/').pop() || '';
  }
}

/** Locked old-project Storage files were copied from Cloudinary with the same public id. */
export function rewriteDeadStorage(src?: string | null) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (!isDeadStorage(value)) return value;
  const file = fileNameOf(value);
  if (!file) return '';
  const migrated = /\/migrated\//i.test(value);
  const known = /^(store-new-|featured-|home-)/i.test(file);
  if (!migrated && !known) return '';
  const kind = /\.(mp4|mov|webm)$/i.test(file) ? 'video' : 'image';
  return `${CLOUDINARY}/${kind}/upload/mbp/${file}`;
}

export function resolveMediaUrl(src?: string | null) {
  const revived = rewriteDeadStorage(src);
  if (!revived) return '';
  if (/^https?:\/\//i.test(revived) || revived.startsWith('data:') || revived.startsWith('/')) return revived;
  return `/${revived.replace(/^\/+/, '')}`;
}

/** Local and Netlify assets stay static. Only live Supabase files go through Next image cache. */
export function shouldProxyImage(src?: string | null) {
  const url = resolveMediaUrl(src);
  return isSupabaseStorage(url) && !isDeadStorage(url);
}

export function localOrFallback(src: string, fallback: string) {
  return isSupabaseStorage(src) ? fallback : src;
}
