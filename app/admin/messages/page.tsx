'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';

export default function AdminMessagesPage() {
  const { authFetch, user } = useAdmin();
  const [events, setEvents] = useState<any[]>([]);
  const [carts, setCarts] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      authFetch('/api/admin/analytics/summary').then((r) => r.json()),
      authFetch('/api/admin/abandoned-carts').then((r) => r.json()),
      authFetch('/api/admin/newsletter').then((r) => r.json()),
    ]).then(([summary, abandoned, newsletter]) => {
      setEvents((summary.recentEvents || []).filter((e: any) => e.type === 'whatsapp_click'));
      setCarts(abandoned.carts || []);
      setSubs(newsletter.subscribers || []);
    });
  }, [user, authFetch]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <h1>Messages & enquiries</h1>
      <h2>WhatsApp clicks</h2>
      {events.length === 0 ? <p className="admin-muted">No WhatsApp clicks tracked yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Time</th><th>Source</th><th>Product</th></tr></thead>
          <tbody>
            {events.slice(0, 50).map((e) => (
              <tr key={e.id}>
                <td>{String(e.at || '').slice(0, 19)}</td>
                <td>{e.payload?.source || '—'}</td>
                <td>{e.payload?.productId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2>Abandoned carts</h2>
      {carts.length === 0 ? <p className="admin-muted">No abandoned carts stored.</p> : (
        <table className="admin-table">
          <thead><tr><th>Updated</th><th>Value</th><th>Items</th></tr></thead>
          <tbody>
            {carts.slice(0, 30).map((c) => (
              <tr key={c.token}>
                <td>{String(c.updatedAt || '').slice(0, 19)}</td>
                <td>₦{Number(c.value || 0).toLocaleString('en-NG')}</td>
                <td>{(c.items || []).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2>Newsletter</h2>
      {subs.length === 0 ? <p className="admin-muted">No subscribers yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Email</th><th>Joined</th></tr></thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.email}><td>{s.email}</td><td>{String(s.at || '').slice(0, 19)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
