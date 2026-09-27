export function resolveMediaUrl(src?: string | null) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/')) return value;
  return `/${value.replace(/^\/+/, '')}`;
}

export function isSupabaseStorage(src?: string | null) {
  return /supabase\.co\/storage/i.test(String(src || ''));
}

/** Local and Netlify assets stay static. Only Supabase files go through Next image cache. */
export function shouldProxyImage(src?: string | null) {
  return isSupabaseStorage(src);
}

export function localOrFallback(src: string, fallback: string) {
  return isSupabaseStorage(src) ? fallback : src;
}
