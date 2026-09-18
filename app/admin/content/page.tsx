'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';

export default function AdminContentPage() {
  const { authFetch, user } = useAdmin();
  const [heroVideo, setHeroVideo] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [meta, setMeta] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch('/api/content/home').then((r) => r.json()),
      authFetch('/api/admin/home/reviews').then((r) => r.json()),
    ]).then(([home, rev]) => {
      setHeroVideo(home.heroVideo || '');
      setReviews(rev.reviews || home.reviews || []);
    });
  }, [user, authFetch]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <h1>Content</h1>
      {msg && <p className="admin-muted">{msg}</p>}
      <form
        className="admin-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await authFetch('/api/admin/home/hero-video', {
            method: 'PUT',
            body: JSON.stringify({ heroVideo }),
          });
          if (!r.ok) {
            setMsg('Failed to save hero video');
            return;
          }
          setMsg('Hero video saved');
        }}
      >
        <h2 style={{ margin: 0 }}>Homepage hero video URL</h2>
        <label>
          Supabase / media URL
          <input value={heroVideo} onChange={(e) => setHeroVideo(e.target.value)} />
        </label>
        <button className="admin-btn" type="submit">Save hero</button>
      </form>

      <form
        className="admin-form"
        style={{ marginTop: '1rem' }}
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await authFetch('/api/admin/home/reviews', {
            method: 'POST',
            body: JSON.stringify({ text, meta }),
          });
          const j = await r.json();
          if (!r.ok) {
            setMsg(j.error || 'Failed');
            return;
          }
          setText('');
          setMeta('');
          const rev = await authFetch('/api/admin/home/reviews').then((x) => x.json());
          setReviews(rev.reviews || []);
          setMsg('Testimonial added');
        }}
      >
        <h2 style={{ margin: 0 }}>Homepage testimonials</h2>
        <label>Quote<textarea value={text} onChange={(e) => setText(e.target.value)} required /></label>
        <label>Attribution<input value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Ada — Lagos" /></label>
        <button className="admin-btn" type="submit">Add testimonial</button>
      </form>

      <ul>
        {reviews.map((r) => (
          <li key={r.id} style={{ marginTop: '0.75rem' }}>
            “{r.text}” — {r.meta}
            <button
              type="button"
              className="admin-btn danger"
              style={{ marginLeft: '0.5rem' }}
              onClick={async () => {
                await authFetch(`/api/admin/home/reviews/${r.id}`, { method: 'DELETE' });
                const rev = await authFetch('/api/admin/home/reviews').then((x) => x.json());
                setReviews(rev.reviews || []);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
