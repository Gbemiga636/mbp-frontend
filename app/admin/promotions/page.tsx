'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';

export default function AdminPromotionsPage() {
  const { authFetch, user } = useAdmin();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [type, setType] = useState('percent');
  const [value, setValue] = useState('10');

  const load = async () => {
    const r = await authFetch('/api/admin/promotions');
    const j = await r.json();
    setPromotions(j.promotions || []);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <h1>Promotions</h1>
      <form
        className="admin-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await authFetch('/api/admin/promotions', {
            method: 'POST',
            body: JSON.stringify({ code, type, value: Number(value) }),
          });
          setCode('');
          await load();
        }}
      >
        <label>Code<input value={code} onChange={(e) => setCode(e.target.value)} required /></label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        <label>Value<input value={value} onChange={(e) => setValue(e.target.value)} required /></label>
        <button className="admin-btn" type="submit">Create promo</button>
      </form>
      <table className="admin-table" style={{ marginTop: '1rem' }}>
        <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {promotions.map((p) => (
            <tr key={p.id}>
              <td>{p.code}</td>
              <td>{p.type}</td>
              <td>{p.value}</td>
              <td>{p.active ? 'Yes' : 'No'}</td>
              <td>
                <button
                  type="button"
                  className="admin-btn danger"
                  onClick={async () => {
                    await authFetch(`/api/admin/promotions/${p.id}`, { method: 'DELETE' });
                    await load();
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {promotions.length === 0 && <p className="admin-muted">No discount codes yet.</p>}
    </div>
  );
}
