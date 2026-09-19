'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useStore } from '@/components/providers/StoreProvider';
import { SearchOverlay } from '@/components/layout/SearchOverlay';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BrandLoader } from '@/components/layout/BrandLoader';
import { ExperienceCursor } from '@/components/experience/Cursor';
import { whatsappUrl } from '@/lib/format';
import { SizePrompt } from '@/components/product/SizePrompt';
import { ShoppingAssistant } from '@/components/assistant/ShoppingAssistant';
import { storage } from '@/lib/storage';
import { trackEvent } from '@/lib/api';
import type { Product } from '@/lib/types';
import styles from './SiteChrome.module.css';

export function SiteChrome({ children, products = [] }: { children: React.ReactNode; products?: Product[] }) {
  const pathname = usePathname();
  const { toasts, cart } = useStore();
  const [consent, setConsent] = useState<string | null>(null);
  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdmin) return;
    setConsent(storage.getConsent());
    trackEvent('page_view', { path: window.location.pathname });
  }, [isAdmin, pathname]);

  useEffect(() => {
    if (isAdmin) return;
    let sid = sessionStorage.getItem('mbp_presence');
    if (!sid) {
      sid = `view_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('mbp_presence', sid);
    }
    const beat = () => {
      if (document.visibilityState !== 'visible') return;
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, path: window.location.pathname }),
      }).catch(() => null);
    };
    beat();
    const t = window.setInterval(beat, 20000);
    document.addEventListener('visibilitychange', beat);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [isAdmin, pathname]);

  useEffect(() => {
    if (isAdmin || !cart.length) return;
    let token = localStorage.getItem('mbp_guest_token');
    if (!token) {
      token = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('mbp_guest_token', token);
    }
    const t = window.setTimeout(() => {
      fetch('/api/abandoned-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, items: cart }),
      }).catch(() => null);
    }, 2500);
    return () => window.clearTimeout(t);
  }, [cart, isAdmin]);

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <ExperienceCursor />
      <BrandLoader />
      <Header products={products} />
      <main className="site-main">{children}</main>
      <Footer />
      <CartDrawer />
      <SearchOverlay products={products} />
      <SizePrompt />
      <ShoppingAssistant />

      <a
        className={styles.wa}
        href={whatsappUrl('Hello MBP Lingerie, I need assistance with an order.')}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        data-cursor="Chat"
        onClick={() => trackEvent('whatsapp_click', { source: 'floating' })}
      >
        <MessageCircle size={20} />
        <span>Chat</span>
      </a>

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.message}
          </div>
        ))}
      </div>

      {consent == null && (
        <div className={styles.cookie}>
          <div>
            <strong>Cookies</strong>
            <p className="muted">We use essential cookies for your cart. Choose accept or reject non-essential cookies.</p>
          </div>
          <div className={styles.cookieActions}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                storage.setConsent('accepted');
                setConsent('accepted');
              }}
            >
              Accept
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                storage.setConsent('rejected');
                setConsent('rejected');
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </>
  );
}
