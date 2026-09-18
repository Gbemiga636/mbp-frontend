'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';

export default function AdminCustomersPage() {
  const { authFetch, user } = useAdmin();
  const [orders, setOrders] = useState<any[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!user) return;
    authFetch('/api/admin/orders')
      .then((r) => r.json())
      .then((j) => setOrders(Array.isArray(j) ? j : j.orders || []));
  }, [user, authFetch]);

  const customers = useMemo(() => {
    const map = new Map<string, { email: string; phone: string; orders: number; spend: number }>();
    for (const o of orders) {
      const email = o.customer?.email || 'unknown';
      const prev = map.get(email) || { email, phone: o.customer?.phone || '', orders: 0, spend: 0 };
      prev.orders += 1;
      prev.spend += Number(o.totals?.total || 0);
      if (o.customer?.phone) prev.phone = o.customer.phone;
      map.set(email, prev);
    }
    return [...map.values()]
      .filter((c) => !q || c.email.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q))
      .sort((a, b) => b.spend - a.spend);
  }, [orders, q]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <h1>Customers</h1>
      <p className="admin-muted">Derived from real paid orders (no fabricated profiles).</p>
      <input
        style={{ minHeight: 42, borderRadius: 10, border: '1px solid rgba(0,0,0,.12)', padding: '0.5rem 0.75rem', width: 'min(360px, 100%)', marginBottom: '1rem' }}
        placeholder="Search email or phone"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {customers.length === 0 ? (
        <p className="admin-muted">No customers yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Spend</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.email}>
                <td>{c.email}</td>
                <td>{c.phone || '—'}</td>
                <td>{c.orders}</td>
                <td>₦{c.spend.toLocaleString('en-NG')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
