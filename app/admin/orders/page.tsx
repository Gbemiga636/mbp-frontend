'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';

const STATUSES = ['pending', 'confirmed', 'processing', 'ready', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrdersPage() {
  const { authFetch, user } = useAdmin();
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const r = await authFetch('/api/admin/orders');
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Failed');
    setOrders(Array.isArray(j) ? j : j.orders || []);
  };

  useEffect(() => {
    if (!user) return;
    load().catch((e) => setMsg(e.message));
  }, [user]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <h1>Orders</h1>
      {msg && <p className="admin-muted">{msg}</p>}
      {orders.length === 0 ? (
        <p className="admin-muted">No orders yet. Paid Paystack orders appear here.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.reference}>
                <td>{o.reference}</td>
                <td>
                  {o.customer?.email || '—'}
                  <div className="admin-muted">{o.customer?.phone}</div>
                </td>
                <td>₦{Number(o.totals?.total || 0).toLocaleString('en-NG')}</td>
                <td>{o.status || 'confirmed'}</td>
                <td>
                  <button type="button" className="admin-btn ghost" onClick={() => setSelected(o)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="admin-card" style={{ marginTop: '1rem' }}>
          <h2>Order {selected.reference}</h2>
          <p className="admin-muted">{selected.customer?.address}</p>
          <p>Notes: {selected.notes || '—'}</p>
          <ul>
            {(selected.totals?.items || []).map((it: any, i: number) => (
              <li key={i}>{it.name} × {it.quantity || it.qty || 1} — ₦{Number(it.price || 0).toLocaleString('en-NG')}</li>
            ))}
          </ul>
          <label>
            Status
            <select
              value={selected.status || 'confirmed'}
              onChange={async (e) => {
                const status = e.target.value;
                const r = await authFetch(`/api/admin/orders/${encodeURIComponent(selected.reference)}/status`, {
                  method: 'PUT',
                  body: JSON.stringify({ status }),
                });
                const j = await r.json();
                if (!r.ok) {
                  setMsg(j.error || 'Update failed');
                  return;
                }
                setSelected(j);
                await load();
                setMsg('Status updated');
              }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="admin-actions">
            <button type="button" className="admin-btn ghost" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
