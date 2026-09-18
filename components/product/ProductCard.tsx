'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, Heart, MessageCircle } from 'lucide-react';
import type { Product } from '@/lib/types';
import { displayPrice, formatNaira, productWhatsAppMessage, whatsappUrl } from '@/lib/format';
import { useStore } from '@/components/providers/StoreProvider';
import { trackEvent } from '@/lib/api';
import { QuickView } from '@/components/product/QuickView';
import styles from './ProductCard.module.css';

const BADGE_LABEL: Record<string, string> = {
  new: 'New',
  bestseller: 'Bestseller',
  limited: 'Limited',
  sale: 'Sale',
  'almost-gone': 'Almost Gone',
  restocked: 'Restocked',
};

export function ProductCard({ product }: { product: Product }) {
  const { toggleWishlist, isWishlisted, promptAddToCart } = useStore();
  const [quick, setQuick] = useState(false);
  const pricing = displayPrice(product);
  const wished = isWishlisted(product.id);
  const href = `/product/${product.id}`;

  return (
    <>
      <article className={`card-3d ${styles.card}`}>
        <div className={styles.media}>
          <Link href={href}>
            {product.image ? (
              <>
                <Image
                  className={styles.front}
                  src={product.image}
                  alt={product.name}
                  width={480}
                  height={600}
                  unoptimized
                />
                {product.imageBack ? (
                  <Image
                    className={styles.back}
                    src={product.imageBack}
                    alt=""
                    width={480}
                    height={600}
                    unoptimized
                  />
                ) : null}
              </>
            ) : (
              <div className="skeleton" style={{ aspectRatio: '4/5' }} />
            )}
          </Link>

          <div className={styles.badges}>
            {product.soldOut && <span className={styles.sold}>Sold out</span>}
            {(product.badges || []).map((b) => (
              <span key={b}>{BADGE_LABEL[b] || b}</span>
            ))}
            {pricing.discountPct ? <span>-{pricing.discountPct}%</span> : null}
          </div>

          <div className={styles.actions}>
            <button type="button" aria-label="Wishlist" onClick={() => toggleWishlist(product.id)}>
              <Heart size={16} fill={wished ? 'currentColor' : 'none'} />
            </button>
            <button type="button" aria-label="Quick view" onClick={() => setQuick(true)}>
              <Eye size={16} />
            </button>
            <a
              aria-label="WhatsApp"
              href={whatsappUrl(
                productWhatsAppMessage({
                  product,
                  productUrl: typeof window !== 'undefined' ? `${window.location.origin}${href}` : href,
                })
              )}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent('whatsapp_click', { productId: product.id, source: 'card' })}
            >
              <MessageCircle size={16} />
            </a>
          </div>
        </div>

        <div className={styles.body}>
          <Link href={href}>
            <h3>{product.name}</h3>
          </Link>
          <div className={styles.price}>
            <strong>{formatNaira(pricing.price)}</strong>
            {pricing.original ? <s className="muted">{formatNaira(pricing.original)}</s> : null}
          </div>
          {product.sizes && product.sizes.length > 0 && (
            <p className={`muted ${styles.sizes}`}>{product.sizes.slice(0, 6).join(' · ')}</p>
          )}
          <button
            type="button"
            className="btn btn--ghost"
            disabled={product.soldOut}
            onClick={() => promptAddToCart(product)}
          >
            Quick add
          </button>
        </div>
      </article>

      {quick && <QuickView product={product} onClose={() => setQuick(false)} />}
    </>
  );
}
