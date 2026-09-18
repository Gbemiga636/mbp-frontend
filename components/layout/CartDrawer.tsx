'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '@/components/providers/StoreProvider';
import { cartWhatsAppMessage, formatNaira, whatsappUrl } from '@/lib/format';
import { trackEvent } from '@/lib/api';
import styles from './CartDrawer.module.css';

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, updateQty, removeFromCart, cartSubtotal } = useStore();

  return (
    <div className={`${styles.wrap} ${cartOpen ? styles.open : ''}`} aria-hidden={!cartOpen}>
      <div className={styles.scrim} onClick={() => setCartOpen(false)} />
      <aside className={styles.panel} role="dialog" aria-label="Shopping cart">
        <div className={styles.top}>
          <h2 className="display">Your bag</h2>
          <button type="button" className="icon-btn" aria-label="Close cart" onClick={() => setCartOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className={styles.empty}>
            <p>Your bag is empty.</p>
            <Link href="/shop" className="btn" onClick={() => setCartOpen(false)}>
              Continue shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {cart.map((item) => (
                <li key={`${item.id}-${item.size}-${item.color || ''}`}>
                  <div className={styles.thumb}>
                    {item.image ? (
                      <Image src={item.image} alt="" width={72} height={90} unoptimized />
                    ) : (
                      <div className="skeleton" style={{ width: 72, height: 90 }} />
                    )}
                  </div>
                  <div className={styles.meta}>
                    <strong>{item.name}</strong>
                    <span className="muted">
                      Size {item.size}
                      {item.color ? ` · ${item.color}` : ''}
                    </span>
                    <span>{formatNaira(item.price)}</span>
                    <div className={styles.qty}>
                      <button type="button" aria-label="Decrease" onClick={() => updateQty(item.id, item.size, item.qty - 1)}>
                        <Minus size={14} />
                      </button>
                      <span>{item.qty}</span>
                      <button type="button" aria-label="Increase" onClick={() => updateQty(item.id, item.size, item.qty + 1)}>
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove"
                        onClick={() => removeFromCart(item.id, item.size)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className={styles.footer}>
              <div className={styles.row}>
                <span>Subtotal</span>
                <strong>{formatNaira(cartSubtotal)}</strong>
              </div>
              <Link href="/cart" className="btn" onClick={() => setCartOpen(false)}>
                Checkout
              </Link>
              <a
                className="btn btn--whatsapp"
                href={whatsappUrl(cartWhatsAppMessage(cart, typeof window !== 'undefined' ? window.location.origin : 'https://mbplingerie.com.ng'))}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent('whatsapp_click', { source: 'cart_drawer' })}
              >
                Order on WhatsApp
              </a>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
