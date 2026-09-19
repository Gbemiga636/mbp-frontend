import { HomePageClient } from '@/components/home/HomePageClient';
import { fetchHome, fetchStore } from '@/lib/api';
import { DEFAULT_REVIEWS } from '@/lib/defaults';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [home, products] = await Promise.all([
    fetchHome().catch(() => ({ featured: [], reviews: [] })),
    fetchStore().catch(() => []),
  ]);

  return (
    <HomePageClient
      home={{
        ...home,
        featured: home.featured?.length ? home.featured : products.slice(0, 10),
        reviews: home.reviews?.length ? home.reviews : DEFAULT_REVIEWS,
      }}
      products={products}
    />
  );
}
