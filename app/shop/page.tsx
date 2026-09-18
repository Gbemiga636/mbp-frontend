import { ShopClient } from '@/components/shop/ShopClient';
import { fetchStore } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shop',
  description: 'Browse MBP Lingerie — lingerie, nightwear, pyjamas and more.',
};

export default async function ShopPage() {
  const products = await fetchStore().catch(() => []);
  return <ShopClient products={products} title="All products" />;
}
