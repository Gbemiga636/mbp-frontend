'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { CATEGORIES } from '@/lib/types';
import { useStore } from '@/components/providers/StoreProvider';
import styles from './Header.module.css';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/shop?sort=newest', label: 'New' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'The House' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const pathname = usePathname();
  const {
    cartCount,
    wishlist,
    menuOpen,
    setMenuOpen,
    setSearchOpen,
    setCartOpen,
  } = useStore();

  if (pathname?.startsWith('/admin')) return null;

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.inner}`}>
          <div className={styles.left}>
            <button
              type="button"
              className={`icon-btn ${styles.menuBtn}`}
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={20} />
            </button>

            <nav className={styles.desktopNav} aria-label="Primary">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={styles.navLink}>
                  {l.label}
                </Link>
              ))}
              <div className={styles.megaWrap}>
                <button type="button" className={styles.navLink}>
                  Collections
                </button>
                <div className={styles.mega}>
                  {CATEGORIES.map((c) => (
                    <Link key={c.slug} href={`/shop/${c.slug}`}>
                      {c.name}
                    </Link>
                  ))}
                  <Link href="/size-guide">Size Guide</Link>
                </div>
              </div>
            </nav>
          </div>

          <Link href="/" className={styles.logo} aria-label="MBP Lingerie home">
            <Image src="/assets/Logo.PNG" alt="MBP Lingerie" width={72} height={72} priority />
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
        <div className={styles.scrim} onClick={() => setMenuOpen(false)} />
        <aside className={styles.panel} role="dialog" aria-label="Mobile menu">
          <div className={styles.panelTop}>
            <Image src="/assets/Logo.PNG" alt="" width={40} height={40} />
            <strong className="display">Lingerie</strong>
            <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <nav className={styles.mobileLinks}>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <p className="muted">Shop by category</p>
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/shop/${c.slug}`} onClick={() => setMenuOpen(false)}>
                {c.name}
              </Link>
            ))}
            <Link href="/shop?badge=bestseller" onClick={() => setMenuOpen(false)}>Best Sellers</Link>
            <Link href="/size-guide" onClick={() => setMenuOpen(false)}>Size Guide</Link>
          </nav>
        </aside>
      </div>
    </>
  );
}
