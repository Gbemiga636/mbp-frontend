'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { resolveMediaUrl } from '@/lib/media';
import { formatNaira } from '@/lib/format';

export default function AdminInventoryPage() {
  const { authFetch, user } = useAdmin();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    authFetch('/api/admin/store/products')
      .then((r) => r.json())
      .then((j) => setProducts(j.products || []));
  }, [user, authFetch]);

  if (!user) return null;

  const low = products.filter((p) => !p.soldOut && p.stock != null && Number(p.stock) > 0 && Number(p.stock) <= 3);
  const out = products.filter((p) => p.soldOut || Number(p.stock) === 0);

  return (
    <div className="admin-page">
      <p className="admin-kicker">Stock</p>
      <h1>Inventory</h1>
      <div className="admin-grid">
        <div className="admin-card"><span>Tracked products</span><strong>{products.length}</strong></div>
        <div className="admin-card"><span>Low stock</span><strong>{low.length}</strong></div>
        <div className="admin-card"><span>Out of stock</span><strong>{out.length}</strong></div>
      </div>
      <h2>All stock</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Look</th>
            <th>Product</th>
            <th>Price</th>
            <th>Sizes</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const src = resolveMediaUrl(p.image || '');
            return (
              <tr key={p.id}>
                <td>{src ? <img className="admin-thumb" src={src} alt="" /> : '—'}</td>
                <td>
                  <strong>{p.name}</strong>
                  <div className="admin-muted">{p.category} · {p.sku || 'no sku'}</div>
                </td>
                <td>{formatNaira(Number(p.salePrice || p.price || 0))}</td>
                <td>{Array.isArray(p.sizes) ? p.sizes.join(', ') : p.sizes || '—'}</td>
                <td>{p.soldOut ? 'Sold out' : (p.stock ?? '—')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
