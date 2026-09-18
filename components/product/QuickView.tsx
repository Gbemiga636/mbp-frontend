'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import type { Product } from '@/lib/types';
import { displayPrice, formatNaira, productWhatsAppMessage, whatsappUrl } from '@/lib/format';
import { useStore } from '@/components/providers/StoreProvider';
import { trackEvent } from '@/lib/api';
import styles from './QuickView.module.css';

const FALLBACK_SIZES = ['S', 'M', 'L', 'XL'];

export function QuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const { addToCart } = useStore();
  const [size, setSize] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const [color, setColor] = useState(product.colors?.[0] || '');
  const pricing = displayPrice(product);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/product/${product.id}` : `/product/${product.id}`;
  const sizes = product.sizes?.filter(Boolean)?.length ? product.sizes.filter(Boolean) : FALLBACK_SIZES;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Quick view">
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.panel}>
        <button type="button" className={`icon-btn ${styles.close}`} aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className={styles.grid}>
          <div className={styles.media}>
            {product.image ? (
              <Image src={product.image} alt={product.name} width={520} height={650} unoptimized />
            ) : null}
          </div>
          <div>
            <h2 className="display">{product.name}</h2>
            <p className={styles.price}>{formatNaira(pricing.price)}</p>
            {product.desc && <p className="muted">{product.desc}</p>}

            <div className={styles.field}>
              <span>Which size would you like?</span>
              <div className={styles.chips}>
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={size === s ? styles.active : ''}
                    onClick={() => {
                      setSize(s);
                      setSizeError(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {sizeError && <p className={styles.error}>Please select a size to continue.</p>}
            </div>

            {(product.colors?.length || 0) > 0 && (
              <div className={styles.field}>
                <span>Color</span>
                <div className={styles.chips}>
                  {product.colors!.map((c) => (
                    <button key={c} type="button" className={color === c ? styles.active : ''} onClick={() => setColor(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.cta}>
              <button
                type="button"
                className="btn"
                disabled={product.soldOut}
                onClick={() => {
                  if (!size) {
                    setSizeError(true);
                    return;
                  }
                  addToCart(product, { size, color });
                  onClose();
                }}
              >
                Add to cart
              </button>
              <a
                className="btn btn--whatsapp"
                href={whatsappUrl(productWhatsAppMessage({ product, size, color, productUrl: url }))}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent('whatsapp_click', { productId: product.id, source: 'quick_view' })}
              >
                Order on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
