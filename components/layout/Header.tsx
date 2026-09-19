'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart, Menu, MessageCircle, Search, ShoppingBag, X } from 'lucide-react';
import { CATEGORIES } from '@/lib/types';
import type { Product } from '@/lib/types';
import { useStore } from '@/components/providers/StoreProvider';
import { imageByCategory } from '@/lib/defaults';
import styles from './Header.module.css';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/shop?sort=newest', label: 'New' },
  { href: '/shop?badge=bestseller', label: 'Best sellers' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'The House' },
];

export function Header({ products = [] }: { products?: Product[] }) {
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

  const newest = products.slice(0, 2);

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.inner}`}>
          <div className={styles.left}>
            <button type="button" className={`icon-btn ${styles.menuBtn}`} aria-label="Open menu" onClick={() => setMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <nav className={styles.desktopNav} aria-label="Primary">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={styles.navLink} data-cursor="Explore">
                  {l.label}
                </Link>
              ))}
              <div className={styles.megaWrap}>
                <button type="button" className={styles.navLink}>
                  Collections
                </button>
                <div className={styles.mega}>
                  <div className={styles.megaCats}>
                    {CATEGORIES.map((c) => (
                      <Link key={c.slug} href={`/shop/${c.slug}`} className={styles.megaCat} data-cursor="Explore">
                        <span className={styles.megaThumb}>
                          {imageByCategory(products, c.slug, '') ? (
                            <Image src={imageByCategory(products, c.slug, '')} alt="" width={72} height={90} unoptimized />
                          ) : null}
                        </span>
                        <span>{c.name}</span>
                      </Link>
                    ))}
                    <Link href="/size-guide">Size guide</Link>
                  </div>
                  {newest.length > 0 && (
                    <div className={styles.megaFeat}>
                      <p>Just in</p>
                      {newest.map((p) => (
                        <Link key={p.id} href={`/product/${p.id}`}>
                          {p.image ? <Image src={p.image} alt="" width={90} height={112} unoptimized /> : null}
                          <span>{p.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </nav>
          </div>

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
        <div className={styles.scrim} onClick={() => setMenuOpen(false)} />
        <aside className={styles.panel} role="dialog" aria-label="Menu">
          <div className={styles.panelTop}>
            <span className="display">Enter</span>
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
            <p>The wardrobe</p>
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/shop/${c.slug}`} onClick={() => setMenuOpen(false)}>
                {c.name}
              </Link>
            ))}
            <Link href="/size-guide" onClick={() => setMenuOpen(false)}>Size guide</Link>
            <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
            <a href="https://wa.me/2348087504905?text=Hello%20MBP%20Lingerie%2C%20I%20need%20assistance." target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>
              <MessageCircle size={16} /> WhatsApp
            </a>
          </nav>
        </aside>
      </div>
    </>
  );
}
