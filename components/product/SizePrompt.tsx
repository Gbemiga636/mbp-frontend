'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useStore } from '@/components/providers/StoreProvider';
import { displayPrice, formatNaira } from '@/lib/format';
import styles from './SizePrompt.module.css';

const FALLBACK_SIZES = ['S', 'M', 'L', 'XL'];

export function SizePrompt() {
  const { sizePrompt, closeSizePrompt, addToCart } = useStore();
  const [size, setSize] = useState('');
  const [error, setError] = useState(false);

  const sizes = useMemo(() => {
    const list = sizePrompt?.product.sizes?.filter(Boolean) || [];
    return list.length ? list : FALLBACK_SIZES;
  }, [sizePrompt]);

  useEffect(() => {
    setSize('');
    setError(false);
  }, [sizePrompt?.product.id]);

  if (!sizePrompt) return null;

  const { product, color, qty } = sizePrompt;
  const pricing = displayPrice(product);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Choose a size">
      <div className={styles.scrim} onClick={closeSizePrompt} />
      <div className={styles.panel}>
        <button type="button" className={`icon-btn ${styles.close}`} aria-label="Close" onClick={closeSizePrompt}>
          <X size={18} />
        </button>
        <div className={styles.product}>
          {product.image ? (
            <Image src={product.image} alt="" width={72} height={90} unoptimized />
          ) : null}
          <div>
            <strong>{product.name}</strong>
            <p>{formatNaira(pricing.price)}</p>
          </div>
        </div>
        <p className={styles.ask}>Which size would you like?</p>
        <div className={styles.chips}>
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              className={size === s ? styles.active : ''}
              onClick={() => {
                setSize(s);
                setError(false);
              }}
            >
              {s}
            </button>
          ))}
        </div>
        {error && <p className={styles.error}>Please select a size to continue.</p>}
        <button
          type="button"
          className="btn"
          disabled={product.soldOut}
          onClick={() => {
            if (!size) {
              setError(true);
              return;
            }
            addToCart(product, { size, color, qty });
            closeSizePrompt();
            setSize('');
          }}
        >
          Add to bag
        </button>
        <a href="/size-guide" className={styles.guide}>
          Need help? Open size guide
        </a>
      </div>
    </div>
  );
}
