'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, X } from 'lucide-react';
import styles from './ShoppingAssistant.module.css';

type Msg = { role: 'user' | 'assistant'; text: string; products?: { id: string; name: string; price: number }[] };

export function ShoppingAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'Hi — I am the MBP shopping assistant. Ask about products, sizes, delivery, or WhatsApp ordering. I only answer from the live catalog.',
    },
  ]);

  const ask = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const res = await fetch(`/api/assistant?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: data.reply || 'Please try WhatsApp for help.',
          products: data.products || [],
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: 'I could not reach the catalog just now. Message WhatsApp on 08087504905.' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Shopping assistant">
          <div className={styles.top}>
            <strong>MBP Assistant</strong>
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? styles.user : styles.bot}>
                <p>{m.text}</p>
                {m.products?.map((p) => (
                  <Link key={p.id} href={`/product/${p.id}`} className={styles.productLink}>
                    {p.name} — ₦{Number(p.price).toLocaleString('en-NG')}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <div className={styles.inputRow}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder="Ask about fit, delivery, products…"
              aria-label="Assistant message"
            />
            <button type="button" className="btn" onClick={ask} disabled={busy}>
              Send
            </button>
          </div>
          <a
            className={styles.wa}
            href="https://wa.me/2348087504905?text=Hello%20MBP%20Lingerie%2C%20I%20need%20help%20from%20the%20shopping%20assistant."
            target="_blank"
            rel="noreferrer"
          >
            Continue on WhatsApp
          </a>
        </div>
      )}
      <button type="button" className={styles.fab} aria-label="Open shopping assistant" onClick={() => setOpen((v) => !v)}>
        <MessageCircle size={20} />
      </button>
    </div>
  );
}
