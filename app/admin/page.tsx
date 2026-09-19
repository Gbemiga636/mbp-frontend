'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAdmin } from '@/components/admin/AdminProvider';
import { Spinner } from '@/components/ui/Spinner';

function formatNaira(n: number) {
  return `₦${Number(n || 0).toLocaleString('en-NG')}`;
}

export default function AdminDashboardPage() {
  const { authFetch, user } = useAdmin();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = () => {
      authFetch('/api/admin/analytics/summary')
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.error || 'Failed');
          setData(j);
        })
        .catch((e) => setError(e.message));
    };
    load();
    const t = window.setInterval(load, 15000);
    return () => window.clearInterval(t);
  }, [user, authFetch]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <div className="admin-hero">
        <div>
          <p className="admin-kicker">Overview</p>
          <h1>Dashboard</h1>
        </div>
      </div>
      {error && <p style={{ color: '#9b2c2c' }}>{error}</p>}
      {!data && !error && (
        <div className="admin-loading">
          <Spinner label="Loading live metrics" />
        </div>
      )}
      {data && (
        <>
          <div className="admin-grid">
            <div className="admin-card live">
              <span><i className="admin-live-dot" /> Viewing now</span>
              <strong>{data.liveViewers || 0}</strong>
            </div>
            <Metric label="Page views today" value={String(data.todayPageViews || 0)} />
            <Metric label="Total revenue" value={formatNaira(data.totalRevenue)} />
            <Metric label="Today revenue" value={formatNaira(data.todayRevenue)} />
            <Metric label="Orders" value={String(data.totalOrders)} />
            <Metric label="Today orders" value={String(data.todayOrders)} />
            <Metric label="AOV" value={formatNaira(data.averageOrderValue)} />
            <Metric label="Products" value={String(data.productCount)} />
            <Metric label="Low stock" value={String(data.lowStockCount)} />
            <Metric label="Out of stock" value={String(data.outOfStockCount)} />
            <Metric label="WhatsApp clicks" value={String(data.whatsappClicks)} />
            <Metric label="Product views" value={String(data.productViews)} />
          </div>
          {(data.livePaths || []).length > 0 && (
            <>
              <h2>Where they are</h2>
              <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Page</th><th>Viewers</th></tr></thead>
                <tbody>
                  {data.livePaths.map((row: any) => (
                    <tr key={row.path}><td>{row.path}</td><td>{row.count}</td></tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
          {(data.ordersOverTime || []).length > 0 && (
            <div className="admin-card" style={{ padding: '1rem', margin: '1.2rem 0 2rem' }}>
              <span>Orders over time</span>
              <div style={{ height: 220, marginTop: '0.8rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.ordersOverTime}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#5c1730" fill="#5c1730" fillOpacity={0.16} name="Orders / value" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="admin-actions">
            <Link className="admin-btn" href="/admin/orders">View orders</Link>
            <Link className="admin-btn ghost" href="/admin/products">Manage products</Link>
            <Link className="admin-btn ghost" href="/admin/analytics">Analytics</Link>
          </div>
          <h2>Live activity</h2>
          {(data.recentEvents || []).length === 0 ? (
            <p className="admin-muted">No tracked events yet. Events appear as shoppers browse.</p>
          ) : (
            <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEvents.slice(0, 20).map((e: any) => (
                  <tr key={e.id}>
                    <td>{String(e.at || '').replace('T', ' ').slice(0, 19)}</td>
                    <td>{e.type}</td>
                    <td className="admin-muted">{JSON.stringify(e.payload || {}).slice(0, 80)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

