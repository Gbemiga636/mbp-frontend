'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { useStore } from '@/components/providers/StoreProvider';
import type { Product } from '@/lib/types';
import { formatNaira, displayPrice } from '@/lib/format';
import { storage } from '@/lib/storage';
import { trackEvent } from '@/lib/api';
import styles from './SearchOverlay.module.css';

export function SearchOverlay({ products }: { products: Product[] }) {
  const { searchOpen, setSearchOpen } = useStore();
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (searchOpen) setRecent(storage.getSearches());
  }, [searchOpen]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return products
      .filter((p) => {
        const hay = [p.name, p.desc, p.category, p.sku, ...(p.tags || []), ...(p.colors || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 12);
  }, [q, products]);

  const commitSearch = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...storage.getSearches().filter((x) => x !== t)].slice(0, 8);
    storage.setSearches(next);
    setRecent(next);
    trackEvent('search', { q: t });
  };

  if (!searchOpen) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-label="Search products">
      <div className={styles.panel}>
        <div className={styles.bar}>
          <Search size={18} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSearch(q);
              if (e.key === 'Escape') setSearchOpen(false);
            }}
            placeholder="Search lingerie, nightwear, sizes…"
            aria-label="Search"
          />
          <button type="button" className="icon-btn" aria-label="Close search" onClick={() => setSearchOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {!q && recent.length > 0 && (
          <div className={styles.section}>
            <p className="muted">Recent</p>
            <div className={styles.chips}>
              {recent.map((r) => (
                <button key={r} type="button" onClick={() => setQ(r)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {q && results.length === 0 && (
          <p className={styles.empty}>No products match “{q}”.</p>
        )}

        <ul className={styles.results}>
          {results.map((p) => {
            const pricing = displayPrice(p);
            return (
              <li key={p.id}>
                <Link
                  href={`/product/${p.id}`}
                  onClick={() => {
                    commitSearch(q);
                    setSearchOpen(false);
                  }}
                >
                  <div className={styles.thumb}>
                    {p.image ? (
                      <Image src={p.image} alt="" width={56} height={70} unoptimized />
                    ) : null}
                  </div>
                  <div>
                    <strong>{p.name}</strong>
                    <span className="muted">{formatNaira(pricing.price)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
