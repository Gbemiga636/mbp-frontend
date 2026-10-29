'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';

type Promo = {
  id: string;
  code?: string;
  type: 'percent' | 'fixed';
  value: number;
  applyTo?: 'store' | 'code';
  label?: string;
  active?: boolean;
  minOrder?: number;
};

export default function AdminPromotionsPage() {
  const { authFetch, user } = useAdmin();
  const [promotions, setPromotions] = useState<Promo[]>([]);
  const [msg, setMsg] = useState('');
  const [applyTo, setApplyTo] = useState<'store' | 'code'>('store');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('10');
  const [label, setLabel] = useState('');
  const [minOrder, setMinOrder] = useState('');

  const load = async () => {
    const r = await authFetch('/api/admin/promotions');
    const j = await r.json();
    setPromotions(j.promotions || []);
  };

  useEffect(() => {
    if (user) load().catch((e) => setMsg(e.message));
  }, [user]);

  if (!user) return null;

  const storewide = promotions.filter((p) => !p.code || p.applyTo === 'store');
  const coupons = promotions.filter((p) => p.applyTo === 'code' || (p.code && p.applyTo !== 'store'));

  return (
    <div className="admin-page">
      <div className="admin-hero">
        <div>
          <p className="admin-kicker">Pricing</p>
          <h1>Promotions</h1>
          <p className="admin-muted">
            A storewide percent sale strikes through every product price on the site. Coupon codes come off at checkout.
          </p>
        </div>
      </div>
      {msg && <p className="admin-toast">{msg}</p>}

      <form
        className="admin-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg('Saving…');
          try {
            const r = await authFetch('/api/admin/promotions', {
              method: 'POST',
              body: JSON.stringify({
                applyTo,
                code: applyTo === 'code' ? code : '',
                type,
                value: Number(value),
                label: label.trim() || undefined,
                minOrder: minOrder ? Number(minOrder) : 0,
              }),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'Could not save');
            setCode('');
            setLabel('');
            setMinOrder('');
            setMsg(applyTo === 'store' ? 'Storewide sale is live on the site' : 'Coupon created');
            await load();
          } catch (err) {
            setMsg(err instanceof Error ? err.message : 'Failed');
          }
        }}
      >
        <h2>{applyTo === 'store' ? 'Storewide sale' : 'Coupon code'}</h2>
        <label>
          Discount kind
          <select value={applyTo} onChange={(e) => setApplyTo(e.target.value as 'store' | 'code')}>
            <option value="store">All products on the site</option>
            <option value="code">Checkout coupon</option>
          </select>
        </label>
        {applyTo === 'code' && (
          <label>
            Code
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WELCOME10" required />
          </label>
        )}
        <div className="admin-two">
          <label>
            Type
            <select value={type} onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}>
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed naira amount</option>
            </select>
          </label>
          <label>
            {type === 'percent' ? 'Percent off' : 'Amount off (₦)'}
            <input value={value} onChange={(e) => setValue(e.target.value)} required />
          </label>
        </div>
        <div className="admin-two">
          <label>
            Badge label
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={type === 'percent' ? `-${value || 10}% promo` : 'Promo'}
            />
          </label>
          {applyTo === 'code' ? (
            <label>
              Minimum order (₦)
              <input value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0" />
            </label>
          ) : (
            <span />
          )}
        </div>
        <button className="admin-btn" type="submit">
          {applyTo === 'store' ? 'Apply to all products' : 'Create coupon'}
        </button>
      </form>

      <h2>Storewide</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Value</th>
              <th>Live</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {storewide.map((p) => (
              <tr key={p.id}>
                <td>{p.label || (p.type === 'percent' ? `-${p.value}% promo` : 'Promo')}</td>
                <td>{p.type === 'percent' ? `${p.value}%` : `₦${Number(p.value).toLocaleString('en-NG')}`}</td>
                <td>{p.active ? 'Yes' : 'Off'}</td>
                <td>
                  <button
                    type="button"
                    className="admin-btn ghost"
                    onClick={async () => {
                      await authFetch(`/api/admin/promotions/${p.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ active: !p.active }),
                      });
                      await load();
                    }}
                  >
                    {p.active ? 'Turn off' : 'Turn on'}
                  </button>
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
      </div>
      {storewide.length === 0 && <p className="admin-muted">No storewide sale yet. Add 10% here and every product shows the cut price.</p>}

      <h2>Coupons</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Value</th>
              <th>Min</th>
              <th>Live</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((p) => (
              <tr key={p.id}>
                <td>{p.code}</td>
                <td>{p.type === 'percent' ? `${p.value}%` : `₦${Number(p.value).toLocaleString('en-NG')}`}</td>
                <td>{p.minOrder ? `₦${Number(p.minOrder).toLocaleString('en-NG')}` : '—'}</td>
                <td>{p.active ? 'Yes' : 'Off'}</td>
                <td>
                  <button
                    type="button"
                    className="admin-btn ghost"
                    onClick={async () => {
                      await authFetch(`/api/admin/promotions/${p.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ active: !p.active }),
                      });
                      await load();
                    }}
                  >
                    {p.active ? 'Turn off' : 'Turn on'}
                  </button>
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
      </div>
      {coupons.length === 0 && <p className="admin-muted">No coupon codes yet.</p>}
    </div>
  );
}
