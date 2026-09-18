import { Suspense } from 'react';
import { CartClient } from '@/components/cart/CartClient';

export const metadata = { title: 'Cart & Checkout' };

export default function CartPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '3rem 0' }}>Loading cart…</div>}>
      <CartClient />
    </Suspense>
  );
}
