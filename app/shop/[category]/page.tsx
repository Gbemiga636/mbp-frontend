import { notFound } from 'next/navigation';
import { ShopClient } from '@/components/shop/ShopClient';
import { fetchStore } from '@/lib/api';
import { CATEGORIES } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.slug === category);
  if (!cat) notFound();
  const products = await fetchStore().catch(() => []);
  return <ShopClient products={products} initialCategory={cat.slug} title={cat.name} />;
}
