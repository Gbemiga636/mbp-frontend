'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';

export default function AdminCollectionsPage() {
  const { authFetch, user } = useAdmin();
  const [collections, setCollections] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    const r = await authFetch('/api/admin/collections');
    const j = await r.json();
    setCollections(j.collections || []);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <h1>Collections</h1>
      <form
        className="admin-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const id = name.toLowerCase().replace(/\s+/g, '-');
          const next = [{ id, slug: id, name, description }, ...collections];
          await authFetch('/api/admin/collections', { method: 'PUT', body: JSON.stringify({ collections: next }) });
          setName('');
          setDescription('');
          await load();
        }}
      >
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <button className="admin-btn" type="submit">Create collection</button>
      </form>
      <table className="admin-table" style={{ marginTop: '1rem' }}>
        <thead><tr><th>Name</th><th>Description</th><th></th></tr></thead>
        <tbody>
          {collections.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td className="admin-muted">{c.description}</td>
              <td>
                <button
                  type="button"
                  className="admin-btn danger"
                  onClick={async () => {
                    const next = collections.filter((x) => x.id !== c.id);
                    await authFetch('/api/admin/collections', { method: 'PUT', body: JSON.stringify({ collections: next }) });
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
      {collections.length === 0 && <p className="admin-muted">No custom collections yet.</p>}
    </div>
  );
}
