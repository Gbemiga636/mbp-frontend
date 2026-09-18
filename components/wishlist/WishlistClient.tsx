'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/components/providers/StoreProvider';
import { ProductCard } from '@/components/product/ProductCard';
import type { Product } from '@/lib/types';

export function WishlistClient({ products }: { products: Product[] }) {
  const { wishlist, recentIds } = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const saved = products.filter((p) => wishlist.includes(p.id));
  const recent = products.filter((p) => recentIds.includes(p.id));

  if (!mounted) return <div className="container" style={{ padding: '3rem 0' }}>Loading…</div>;

  return (
    <div className="container" style={{ padding: '2rem 0 4rem' }}>
      <h1 className="display h2">Wishlist</h1>
      {saved.length === 0 ? (
        <div style={{ marginTop: '1.5rem' }}>
          <p className="muted">No saved pieces yet.</p>
          <Link href="/shop" className="btn" style={{ marginTop: '1rem' }}>
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="grid-products" style={{ marginTop: '1.5rem' }}>
          {saved.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <section style={{ marginTop: '3rem' }}>
          <h2 className="display h3">Recently viewed</h2>
          <div className="grid-products" style={{ marginTop: '1rem' }}>
            {recent.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
