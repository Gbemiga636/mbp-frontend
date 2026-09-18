'use client';

import { useEffect, useState } from 'react';

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`/api/reviews/${encodeURIComponent(productId)}`)
      .then((r) => r.json())
      .then((j) => setReviews(j.reviews || []))
      .catch(() => setReviews([]));
  }, [productId]);

  return (
    <section style={{ marginTop: '2.5rem' }}>
      <h2 className="display h3">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="muted">No approved reviews yet. Be the first after your order arrives.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.8rem', marginTop: '1rem' }}>
          {reviews.map((r) => (
            <article key={r.id} className="glass" style={{ padding: '1rem', borderRadius: 16 }}>
              <div aria-label={`${r.rating} stars`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              <p style={{ margin: '0.4rem 0' }}>{r.body}</p>
              <span className="muted">{r.authorName}</span>
            </article>
          ))}
        </div>
      )}

      <form
        style={{ display: 'grid', gap: '0.65rem', marginTop: '1.2rem', maxWidth: 520 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg('Submitting…');
          try {
            const res = await fetch('/api/reviews', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId, rating, body, authorName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            setMsg(data.message || 'Submitted');
            setBody('');
          } catch (err) {
            setMsg(err instanceof Error ? err.message : 'Failed');
          }
        }}
      >
        <h3 style={{ margin: 0 }}>Write a review</h3>
        <label className="field">
          Rating
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="field">Name<input value={authorName} onChange={(e) => setAuthorName(e.target.value)} /></label>
        <label className="field">Review<textarea value={body} onChange={(e) => setBody(e.target.value)} required /></label>
        <button className="btn" type="submit">Submit for approval</button>
        {msg && <p className="muted">{msg}</p>}
      </form>
    </section>
  );
}
