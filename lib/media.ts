const DEAD_STORAGE = /xyuqcztzktqladitoell\.supabase\.co\/storage/i;
const LIVE_STORAGE = /xfyvvbtrxykpywpgicdi\.supabase\.co\/storage/i;
const CLOUDINARY = 'https://res.cloudinary.com/dw4fuxc5l';

export function isDeadStorage(src?: string | null) {
  return DEAD_STORAGE.test(String(src || ''));
}

export function isLiveStorage(src?: string | null) {
  const value = String(src || '');
  if (LIVE_STORAGE.test(value)) return true;
  return /supabase\.co\/storage/i.test(value) && !isDeadStorage(value);
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

export function rewriteDeadStorage(src?: string | null) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (isLiveStorage(value)) return value;
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

/** Browser hits Next/Netlify cache. Only the optimizer talks to live Storage, once. */
export function shouldProxyImage(src?: string | null) {
  const url = resolveMediaUrl(src);
  return isLiveStorage(url);
}

export function localOrFallback(src: string, fallback: string) {
  return isSupabaseStorage(src) ? fallback : src;
}
