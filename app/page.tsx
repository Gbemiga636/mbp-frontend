import { HomePageClient } from '@/components/home/HomePageClient';
import { fetchHome, fetchStore } from '@/lib/api';
import { DEFAULT_REVIEWS } from '@/lib/defaults';

export const revalidate = 300;

export default async function HomePage() {
  const [home, products] = await Promise.all([
    fetchHome().catch(() => ({ featured: [], reviews: [] })),
    fetchStore().catch(() => []),
  ]);

  return (
    <HomePageClient
      home={{
        ...home,
        featured: home.featured?.length ? home.featured : products.slice(0, 6),
        reviews: home.reviews?.length ? home.reviews : DEFAULT_REVIEWS,
      }}
      products={products}
    />
  );
}
