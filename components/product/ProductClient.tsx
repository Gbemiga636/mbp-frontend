'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { displayPrice, formatNaira, productImages, productWhatsAppMessage, whatsappUrl } from '@/lib/format';
import { useStore } from '@/components/providers/StoreProvider';
import { ProductCard } from '@/components/product/ProductCard';
import { trackEvent } from '@/lib/api';
import { ProductReviews } from '@/components/product/ProductReviews';
import styles from './ProductClient.module.css';

const FALLBACK_SIZES = ['S', 'M', 'L', 'XL'];

export function ProductClient({ product, related }: { product: Product; related: Product[] }) {
  const { addToCart, toggleWishlist, isWishlisted, pushRecent } = useStore();
  const images = productImages(product);
  const [active, setActive] = useState(0);
  const [size, setSize] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const [color, setColor] = useState(product.colors?.[0] || '');
  const [qty, setQty] = useState(1);
  const pricing = displayPrice(product);
  const wished = isWishlisted(product.id);
  const sizes = product.sizes?.filter(Boolean)?.length ? product.sizes.filter(Boolean) : FALLBACK_SIZES;

  useEffect(() => {
    pushRecent(product.id);
    trackEvent('product_view', { productId: product.id });
    setSize('');
    setSizeError(false);
  }, [product.id, pushRecent]);

  const productUrl = useMemo(() => {
    if (typeof window === 'undefined') return `https://mbplingerie.com.ng/product/${product.id}`;
    return `${window.location.origin}/product/${product.id}`;
  }, [product.id]);

  const requireSize = () => {
    if (!size) {
      setSizeError(true);
      return false;
    }
    return true;
  };

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.layout}>
        <div className={styles.gallery}>
          <div className={styles.main}>
            {images[active] ? (
              <Image src={images[active]} alt={product.name} width={900} height={1100} unoptimized priority />
            ) : (
              <div className="skeleton" style={{ minHeight: 420 }} />
            )}
          </div>
          {images.length > 1 && (
            <div className={styles.thumbs}>
              {images.map((src, i) => (
                <button key={src + i} type="button" className={i === active ? styles.activeThumb : ''} onClick={() => setActive(i)}>
                  <Image src={src} alt="" width={90} height={110} unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.info}>
          <p className="muted">{product.category || 'MBP'}</p>
          <h1 className="display h2">{product.name}</h1>
          <div className={styles.priceRow}>
            <strong>{formatNaira(pricing.price)}</strong>
            {pricing.original ? <s className="muted">{formatNaira(pricing.original)}</s> : null}
            {pricing.discountPct ? <span className={styles.sale}>-{pricing.discountPct}%</span> : null}
          </div>
          {product.desc && <p className={styles.desc}>{product.desc}</p>}

          <div className={styles.field}>
            <div className={styles.fieldTop}>
              <span>Choose your size</span>
              <Link href="/size-guide">Size guide</Link>
            </div>
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

          <div className={styles.field}>
            <span>Quantity</span>
            <div className={styles.qty}>
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          </div>

          <div className={styles.cta}>
            <button
              type="button"
              className="btn"
              disabled={product.soldOut}
              onClick={() => {
                if (!requireSize()) return;
                addToCart(product, { size, color, qty });
              }}
            >
              {product.soldOut ? 'Sold out' : 'Add to cart'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={product.soldOut}
              onClick={() => {
                if (!requireSize()) return;
                addToCart(product, { size, color, qty });
                window.location.href = '/cart';
              }}
            >
              Buy now
            </button>
            <a
              className="btn btn--whatsapp"
              href={whatsappUrl(productWhatsAppMessage({ product, size, color, quantity: qty, productUrl }))}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent('whatsapp_click', { productId: product.id, source: 'pdp' })}
            >
              Order on WhatsApp
            </a>
            <button type="button" className="btn btn--ghost" onClick={() => toggleWishlist(product.id)}>
              {wished ? 'Saved' : 'Add to wishlist'}
            </button>
          </div>

          <div className={styles.metaBox}>
            <p><strong>Shipping:</strong> Lagos delivery zones at checkout. Discreet packaging.</p>
            <p><strong>Returns:</strong> See our Terms for hygiene-sensitive return guidance.</p>
            {product.materials && <p><strong>Materials:</strong> {product.materials}</p>}
            {product.care && <p><strong>Care:</strong> {product.care}</p>}
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />

      {related.length > 0 && (
        <section className={styles.related}>
          <h2 className="display h3">You may also like</h2>
          <div className="grid-products">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
