export function resolveMediaUrl(src?: string | null) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/')) return value;
  return `/${value.replace(/^\/+/, '')}`;
}
