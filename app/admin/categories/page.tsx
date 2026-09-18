'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';

export default function AdminCategoriesPage() {
  const { authFetch, user } = useAdmin();
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const load = async () => {
    const r = await authFetch('/api/admin/categories');
    const j = await r.json();
    setCategories(j.categories || []);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <h1>Categories</h1>
      <form
        className="admin-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const next = [...categories, { id: slug || name.toLowerCase().replace(/\s+/g, '-'), slug: slug || name.toLowerCase().replace(/\s+/g, '-'), name }];
          await authFetch('/api/admin/categories', { method: 'PUT', body: JSON.stringify({ categories: next }) });
          setName('');
          setSlug('');
          await load();
        }}
      >
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label>Slug<input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" /></label>
        <button className="admin-btn" type="submit">Add category</button>
      </form>
      <table className="admin-table" style={{ marginTop: '1rem' }}>
        <thead><tr><th>Name</th><th>Slug</th><th></th></tr></thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.slug}</td>
              <td>
                <button
                  type="button"
                  className="admin-btn danger"
                  onClick={async () => {
                    const next = categories.filter((x) => x.id !== c.id);
                    await authFetch('/api/admin/categories', { method: 'PUT', body: JSON.stringify({ categories: next }) });
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
  );
}
