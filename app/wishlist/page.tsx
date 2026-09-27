import { WishlistClient } from '@/components/wishlist/WishlistClient';
import { fetchStore } from '@/lib/api';

export const revalidate = 300;
export const metadata = { title: 'Wishlist' };

export default async function WishlistPage() {
  const products = await fetchStore().catch(() => []);
  return <WishlistClient products={products} />;
}
