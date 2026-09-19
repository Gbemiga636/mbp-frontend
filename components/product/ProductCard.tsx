'use client';

import { useState, type MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Product } from '@/lib/types';
import { displayPrice, formatNaira } from '@/lib/format';
import { useStore } from '@/components/providers/StoreProvider';
import { useTilt } from '@/lib/useTilt';
import styles from './ProductCard.module.css';

const BADGE_LABEL: Record<string, string> = {
  new: 'New',
  bestseller: 'Bestseller',
  limited: 'Limited',
  sale: 'Sale',
  'almost-gone': 'Almost gone',
  restocked: 'Restocked',
};

export function ProductCard({ product }: { product: Product }) {
  const { promptAddToCart } = useStore();
  const tilt = useTilt(6);
  const pricing = displayPrice(product);
  const href = `/product/${product.id}`;
  const badges = product.badges || [];
  const faces = [product.image, product.imageBack].filter(Boolean) as string[];
  const [face, setFace] = useState(0);
  const showing = faces[face] || product.image;
  const hasBack = faces.length > 1;

  const turn = (dir: number, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFace((i) => (i + dir + faces.length) % faces.length);
  };

  return (
    <article
      className={styles.card}
      ref={tilt.ref as React.RefObject<HTMLElement>}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
    >
      <div className={styles.media} data-cursor="View">
        <Link href={href}>
          {showing ? (
            <Image
              className={styles.front}
              src={showing}
              alt={hasBack ? `${product.name}, ${face === 0 ? 'front' : 'back'}` : product.name}
              width={480}
              height={600}
              unoptimized
            />
          ) : (
            <div className="skeleton" style={{ aspectRatio: '4/5' }} />
          )}
        </Link>
        <span className={styles.shine} aria-hidden />

        <div className={styles.badges}>
          {product.soldOut && <span className={styles.sold}>Sold out</span>}
          {badges.slice(0, 2).map((b) => (
            <span key={b}>{BADGE_LABEL[b] || b}</span>
          ))}
          {pricing.discountPct ? <span>-{pricing.discountPct}%</span> : null}
        </div>

        {hasBack ? (
          <>
            <button type="button" className={`${styles.flip} ${styles.flipPrev}`} aria-label="View front" onClick={(e) => turn(-1, e)}>
              <ChevronLeft size={16} />
            </button>
            <button type="button" className={`${styles.flip} ${styles.flipNext}`} aria-label="View back" onClick={(e) => turn(1, e)}>
              <ChevronRight size={16} />
            </button>
            <span className={styles.face}>{face === 0 ? 'Front' : 'Back'}</span>
          </>
        ) : null}
      </div>

      <div className={styles.body}>
        <Link href={href}>
          <h3>{product.name}</h3>
        </Link>
        <p className={styles.price}>
          <span>{formatNaira(pricing.price)}</span>
          {pricing.original ? <s>{formatNaira(pricing.original)}</s> : null}
        </p>
        {product.colors?.length ? (
          <p className={styles.meta}>{product.colors.slice(0, 3).join(' · ')}</p>
        ) : product.sizes?.length ? (
          <p className={styles.meta}>{product.sizes.slice(0, 5).join(' · ')}</p>
        ) : null}
        <button
          type="button"
          className={styles.add}
          disabled={product.soldOut}
          onClick={() => promptAddToCart(product)}
        >
          {product.soldOut ? (
            'Sold out'
          ) : (
            <>
              <Plus size={14} strokeWidth={2} />
              Add to bag
            </>
          )}
        </button>
      </div>
    </article>
  );
}
