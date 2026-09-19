'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/components/admin/AdminProvider';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminLoginPage() {
  const { login } = useAdmin();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1rem', background: '#f4f1ee' }}>
      <form
        className="admin-form"
        style={{ width: 'min(420px, 100%)' }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await login(email, password);
            router.replace('/admin');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 style={{ margin: 0 }}>MBP Admin</h1>
        <p className="admin-muted">Sign in to manage the store.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p style={{ color: '#9b2c2c' }}>{error}</p>}
        <button className="admin-btn" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {busy ? <Spinner label="Signing in" /> : null}
      </form>
    </div>
  );
}
