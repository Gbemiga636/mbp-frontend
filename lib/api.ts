import type { GalleryItem, HomeContent, Product, SiteSettings } from './types';
import { DEFAULT_ZONES } from './types';

function apiBase(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:4000';
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers || {}) },
    next: init?.cache === 'no-store' ? undefined : { revalidate: 30 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchHome(): Promise<HomeContent> {
  return apiGet<HomeContent>('/api/content/home', { cache: 'no-store' });
}

export async function fetchStore(): Promise<Product[]> {
  const data = await apiGet<{ products: Product[] }>('/api/content/store', { cache: 'no-store' });
  return data.products || [];
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const products = await fetchStore();
  return products.find((p) => p.id === id || p.slug === id) || null;
}

export async function fetchGallery(): Promise<GalleryItem[]> {
  const data = await apiGet<{ items: GalleryItem[] }>('/api/content/gallery', { cache: 'no-store' });
  return data.items || [];
}

export async function fetchSettings(): Promise<SiteSettings> {
  try {
    const data = await apiGet<SiteSettings>('/api/config', { cache: 'no-store' });
    return {
      ...data,
      deliveryZones: data.deliveryZones?.length ? data.deliveryZones : DEFAULT_ZONES,
      whatsappNumber: data.whatsappNumber || '2348087504905',
    };
  } catch {
    return { deliveryZones: DEFAULT_ZONES, whatsappNumber: '2348087504905', deliveryFee: 0 };
  }
}

export async function trackEvent(type: string, payload: Record<string, unknown> = {}) {
  try {
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload, at: new Date().toISOString() }),
    });
  } catch {
    // non-blocking
  }
}
