'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';

export default function AdminAnalyticsPage() {
  const { authFetch, user } = useAdmin();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const load = () => {
      authFetch('/api/admin/analytics/summary').then((r) => r.json()).then(setData);
    };
    load();
    const t = window.setInterval(load, 15000);
    return () => window.clearInterval(t);
  }, [user, authFetch]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <p className="admin-kicker">Traffic</p>
      <h1>Analytics</h1>
      {!data ? (
        <p className="admin-muted">Loading…</p>
      ) : (
        <>
          <div className="admin-grid">
            <div className="admin-card live">
              <span><i className="admin-live-dot" /> Viewing now</span>
              <strong>{data.liveViewers || 0}</strong>
            </div>
            <div className="admin-card"><span>Page views today</span><strong>{data.todayPageViews || 0}</strong></div>
            <div className="admin-card"><span>All page views</span><strong>{data.pageViews || 0}</strong></div>
            <div className="admin-card"><span>Revenue</span><strong>₦{Number(data.totalRevenue || 0).toLocaleString('en-NG')}</strong></div>
            <div className="admin-card"><span>Orders</span><strong>{data.totalOrders}</strong></div>
            <div className="admin-card"><span>WhatsApp clicks</span><strong>{data.whatsappClicks}</strong></div>
            <div className="admin-card"><span>Product views</span><strong>{data.productViews}</strong></div>
          </div>
          {(data.livePaths || []).length > 0 && (
            <>
              <h2>Live pages</h2>
              <table className="admin-table">
                <thead><tr><th>Page</th><th>People</th></tr></thead>
                <tbody>
                  {data.livePaths.map((row: any) => (
                    <tr key={row.path}><td>{row.path}</td><td>{row.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <h2>Revenue by day</h2>
          {(data.ordersOverTime || []).length === 0 ? (
            <p className="admin-muted">No order data yet.</p>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Date</th><th>Revenue</th></tr></thead>
              <tbody>
                {data.ordersOverTime.map((r: any) => (
                  <tr key={r.date}><td>{r.date}</td><td>₦{Number(r.value).toLocaleString('en-NG')}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <h2>WhatsApp clicks by day</h2>
          {(data.whatsappByDay || []).length === 0 ? (
            <p className="admin-muted">No WhatsApp click events yet.</p>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Date</th><th>Clicks</th></tr></thead>
              <tbody>
                {data.whatsappByDay.map((r: any) => (
                  <tr key={r.date}><td>{r.date}</td><td>{r.value}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
