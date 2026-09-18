'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { DEFAULT_ZONES } from '@/lib/types';

export default function AdminSettingsPage() {
  const { authFetch, user } = useAdmin();
  const [settings, setSettings] = useState<any>({
    storeName: 'MBP Lingerie',
    whatsappNumber: '2348087504905',
    deliveryFee: 0,
    deliveryZones: DEFAULT_ZONES,
  });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    authFetch('/api/admin/settings')
      .then((r) => r.json())
      .then((j) => setSettings((s: any) => ({ ...s, ...j, deliveryZones: j.deliveryZones?.length ? j.deliveryZones : DEFAULT_ZONES })));
  }, [user, authFetch]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <h1>Settings</h1>
      {msg && <p className="admin-muted">{msg}</p>}
      <form
        className="admin-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await authFetch('/api/admin/settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
          });
          if (!r.ok) {
            setMsg('Save failed');
            return;
          }
          setMsg('Settings saved');
        }}
      >
        <label>Store name<input value={settings.storeName || ''} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} /></label>
        <label>WhatsApp number<input value={settings.whatsappNumber || ''} onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })} /></label>
        <label>Default delivery fee<input type="number" value={settings.deliveryFee || 0} onChange={(e) => setSettings({ ...settings, deliveryFee: Number(e.target.value) })} /></label>
        <h3>Delivery zones</h3>
        {(settings.deliveryZones || []).map((z: any, idx: number) => (
          <div key={z.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input
              value={z.label}
              onChange={(e) => {
                const deliveryZones = [...settings.deliveryZones];
                deliveryZones[idx] = { ...z, label: e.target.value };
                setSettings({ ...settings, deliveryZones });
              }}
            />
            <input
              type="number"
              value={z.fee}
              onChange={(e) => {
                const deliveryZones = [...settings.deliveryZones];
                deliveryZones[idx] = { ...z, fee: Number(e.target.value) };
                setSettings({ ...settings, deliveryZones });
              }}
            />
          </div>
        ))}
        <button className="admin-btn" type="submit">Save settings</button>
      </form>
      <p className="admin-muted" style={{ marginTop: '1rem' }}>
        Admin access uses the single env-configured account (Wave 2 roles table ready in SQL schema).
      </p>
    </div>
  );
}
