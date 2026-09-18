import { HomePageClient } from '@/components/home/HomePageClient';
import { fetchHome, fetchStore } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [home, products] = await Promise.all([
    fetchHome().catch(() => ({ featured: [], reviews: [] })),
    fetchStore().catch(() => []),
  ]);

  return <HomePageClient home={home} products={products} />;
}
