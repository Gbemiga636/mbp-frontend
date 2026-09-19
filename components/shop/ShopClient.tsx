'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { CATEGORIES } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import styles from './ShopClient.module.css';

type Sort = 'recommended' | 'newest' | 'price-asc' | 'price-desc';

export function ShopClient({
  products,
  initialCategory,
  initialSort,
  initialBadge,
  title = 'Shop',
}: {
  products: Product[];
  initialCategory?: string;
  initialSort?: string;
  initialBadge?: string;
  title?: string;
}) {
  const [category, setCategory] = useState(initialCategory || 'all');
  const [sort, setSort] = useState<Sort>((initialSort as Sort) || 'recommended');
  const [badge] = useState(initialBadge || '');
  const [size, setSize] = useState('all');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(0);

  const prices = products.map((p) => Number(p.salePrice || p.price || 0));
  const absoluteMax = Math.max(50000, ...prices, 0);

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => (p.sizes || []).forEach((s) => set.add(s)));
    return [...set].sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (category !== 'all') list = list.filter((p) => (p.category || '').toLowerCase() === category);
    if (badge) list = list.filter((p) => (p.badges || []).some((b) => b === badge));
    if (onlyInStock) list = list.filter((p) => !p.soldOut);
    if (size !== 'all') list = list.filter((p) => (p.sizes || []).includes(size));
    if (maxPrice > 0) list = list.filter((p) => Number(p.salePrice || p.price || 0) <= maxPrice);

    if (sort === 'price-asc') list.sort((a, b) => Number(a.salePrice || a.price) - Number(b.salePrice || b.price));
    if (sort === 'price-desc') list.sort((a, b) => Number(b.salePrice || b.price) - Number(a.salePrice || a.price));
    if (sort === 'newest') list = list.reverse();
    return list;
  }, [products, category, sort, size, onlyInStock, maxPrice, badge]);

  const Filters = (
    <div className={styles.filters}>
      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Size
        <select value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="all">All sizes</option>
          {allSizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sort
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="recommended">Recommended</option>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </label>
      <label>
        Max price ₦{maxPrice || absoluteMax}
        <input
          type="range"
          min={0}
          max={absoluteMax}
          step={1000}
          value={maxPrice || absoluteMax}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
        />
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} />
        In stock only
      </label>
    </div>
  );

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <div>
          <p className="muted">Collection</p>
          <h1 className="display h2">{title}</h1>
          <p className="muted">{filtered.length} pieces</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => setFiltersOpen(true)}>
          Filters
        </button>
      </header>

      <nav className={styles.cats} aria-label="Categories">
        <Link href="/shop" className={category === 'all' ? styles.on : ''} onClick={() => setCategory('all')}>
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/shop/${c.slug}`}
            className={category === c.slug ? styles.on : ''}
            onClick={() => setCategory(c.slug)}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <div className={styles.layout}>
        <aside className={styles.desktopFilters}>{Filters}</aside>
        <div>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <p>No products match these filters.</p>
              <button type="button" className="btn" onClick={() => { setCategory('all'); setSize('all'); setMaxPrice(0); setOnlyInStock(false); }}>
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid-products">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className={styles.sheet}>
          <div className={styles.sheetScrim} onClick={() => setFiltersOpen(false)} />
          <div className={styles.sheetPanel}>
            <div className={styles.sheetTop}>
              <h2>Filters</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setFiltersOpen(false)}>
                Done
              </button>
            </div>
            {Filters}
          </div>
        </div>
      )}
    </div>
  );
}
