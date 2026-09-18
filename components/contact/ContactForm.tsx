'use client';

import { useState } from 'react';

export function ContactForm() {
  const [status, setStatus] = useState('');
  return (
    <form
      style={{ display: 'grid', gap: '0.75rem', marginTop: '0.8rem' }}
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setStatus('Sending…');
        try {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: fd.get('name'),
              email: fd.get('email'),
              message: fd.get('message'),
            }),
          });
          if (!res.ok) throw new Error('Failed');
          setStatus('Message received. Thank you.');
          e.currentTarget.reset();
        } catch {
          setStatus('Could not send. Please use WhatsApp instead.');
        }
      }}
    >
      <label className="field">Name<input name="name" required /></label>
      <label className="field">Email<input name="email" type="email" required /></label>
      <label className="field">Message<textarea name="message" required /></label>
      <button className="btn" type="submit">Send message</button>
      {status && <p className="muted">{status}</p>}
    </form>
  );
}
