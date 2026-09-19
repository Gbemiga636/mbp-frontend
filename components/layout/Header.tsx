'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart, Menu, MessageCircle, Search, ShoppingBag, X } from 'lucide-react';
import { CATEGORIES } from '@/lib/types';
import type { Product } from '@/lib/types';
import { useStore } from '@/components/providers/StoreProvider';
import styles from './Header.module.css';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/shop?sort=newest', label: 'New' },
  { href: '/shop?badge=bestseller', label: 'Best sellers' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'The House' },
];

export function Header({ products: _products = [] }: { products?: Product[] }) {
  const pathname = usePathname();
  const {
    cartCount,
    wishlist,
    menuOpen,
    setMenuOpen,
    setSearchOpen,
    setCartOpen,
  } = useStore();
  const [logoOk, setLogoOk] = useState(true);

  if (pathname?.startsWith('/admin')) return null;

  const close = () => setMenuOpen(false);

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.inner}`}>
          <button type="button" className={`icon-btn ${styles.menuBtn}`} aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>

          <Link href="/" className={styles.logo} aria-label="MBP Lingerie home">
            {logoOk ? (
              <Image src="/assets/Logo.PNG" alt="MBP Lingerie" width={72} height={72} priority unoptimized onError={() => setLogoOk(false)} />
            ) : (
              <span className={styles.wordmark}>MBP</span>
            )}
          </Link>

          <div className={styles.actions}>
            <button type="button" className="icon-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <Search size={18} />
            </button>
            <Link href="/wishlist" className="icon-btn" aria-label="Wishlist">
              <Heart size={18} />
              {wishlist.length > 0 && <span className="badge-count">{wishlist.length}</span>}
            </Link>
            <button type="button" className="icon-btn" aria-label="Cart" onClick={() => setCartOpen(true)}>
              <ShoppingBag size={18} />
              {cartCount > 0 && <span className="badge-count">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <div className={`${styles.drawer} ${menuOpen ? styles.open : ''}`} aria-hidden={!menuOpen}>
        <div className={styles.scrim} onClick={close} />
        <aside className={styles.panel} role="dialog" aria-label="Menu">
          <div className={styles.panelTop}>
            <span className="display">Enter</span>
            <button type="button" className="icon-btn" aria-label="Close menu" onClick={close}>
              <X size={18} />
            </button>
          </div>
          <nav className={styles.mobileLinks}>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={close}>
                {l.label}
              </Link>
            ))}
            <p>The wardrobe</p>
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/shop/${c.slug}`} onClick={close}>
                {c.name}
              </Link>
            ))}
            <Link href="/size-guide" onClick={close}>Size guide</Link>
            <Link href="/contact" onClick={close}>Contact</Link>
            <a href="https://wa.me/2348087504905?text=Hello%20MBP%20Lingerie%2C%20I%20need%20assistance." target="_blank" rel="noreferrer" onClick={close}>
              <MessageCircle size={16} /> WhatsApp
            </a>
          </nav>
        </aside>
      </div>
    </>
  );
}
