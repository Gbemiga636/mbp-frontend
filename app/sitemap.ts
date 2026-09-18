import type { MetadataRoute } from 'next';
import { fetchStore } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.PUBLIC_SITE_URL || 'https://mbplingerie.com.ng';
  const staticRoutes = ['', '/shop', '/gallery', '/contact', '/about', '/size-guide', '/wishlist', '/cart', '/terms', '/privacy'].map(
    (path) => ({
      url: `${base}${path || '/'}`,
      lastModified: new Date(),
    })
  );

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await fetchStore();
    productRoutes = products.map((p) => ({
      url: `${base}/product/${p.id}`,
      lastModified: new Date(),
    }));
  } catch {
    productRoutes = [];
  }

  return [...staticRoutes, ...productRoutes];
}
