'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';

export default function AdminReviewsPage() {
  const { authFetch, user } = useAdmin();
  const [reviews, setReviews] = useState<any[]>([]);

  const load = async () => {
    const r = await authFetch('/api/admin/reviews');
    const j = await r.json();
    setReviews(j.reviews || []);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <h1>Product reviews</h1>
      <p className="admin-muted">Approve genuine customer reviews. Nothing is fabricated.</p>
      {reviews.length === 0 ? (
        <p className="admin-muted">No reviews submitted yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td>{r.productId}</td>
                <td>{r.rating}</td>
                <td>{r.body}<div className="admin-muted">{r.authorName}</div></td>
                <td>{r.approved ? 'Approved' : 'Pending'}</td>
                <td>
                  <div className="admin-actions">
                    {!r.approved && (
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={async () => {
                          await authFetch(`/api/admin/reviews/${r.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ approved: true }),
                          });
                          await load();
                        }}
                      >
                        Approve
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-btn danger"
                      onClick={async () => {
                        await authFetch(`/api/admin/reviews/${r.id}`, { method: 'DELETE' });
                        await load();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
