'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/components/providers/StoreProvider';
import { cartWhatsAppMessage, formatNaira, whatsappUrl } from '@/lib/format';
import { DEFAULT_ZONES } from '@/lib/types';
import { storage } from '@/lib/storage';
import { trackEvent } from '@/lib/api';
import styles from './CartClient.module.css';

export function CartClient() {
  const { cart, updateQty, removeFromCart, cartSubtotal, clearCart, toast } = useStore();
  const params = useSearchParams();
  const [zones, setZones] = useState(DEFAULT_ZONES);
  const [zoneId, setZoneId] = useState('lekki');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setZoneId(storage.getZone() || 'lekki');
    fetch('/api/config')
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.deliveryZones) && j.deliveryZones.length) setZones(j.deliveryZones);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;
    (async () => {
      try {
        setBusy(true);
        const res = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Verification failed');
        clearCart();
        trackEvent('purchase', { reference });
        setNotice('Payment successful. A confirmation email is on its way.');
        toast('Order confirmed');
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Could not verify payment');
      } finally {
        setBusy(false);
      }
    })();
  }, [params, clearCart, toast]);

  const delivery = useMemo(() => zones.find((z) => z.id === zoneId)?.fee || 0, [zones, zoneId]);
  const total = cartSubtotal + delivery;

  const checkout = async () => {
    if (!cart.length) return;
    if (!email || !phone || !address) {
      setNotice('Please fill email, phone and delivery address.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      trackEvent('begin_checkout', { total, zoneId });
      storage.setZone(zoneId);
      const items = [
        ...cart.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
          quantity: i.qty,
          size: i.size,
          color: i.color,
          image: i.image,
        })),
        {
          id: `__delivery__${zoneId}`,
          name: `Delivery (${zones.find((z) => z.id === zoneId)?.label || zoneId})`,
          price: delivery,
          qty: 1,
          quantity: 1,
        },
      ];
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { email, phone, address },
          email,
          phone,
          address,
          notes,
          items,
          deliveryZone: zoneId,
          deliveryFee: delivery,
          callback_url:
            typeof window !== 'undefined' ? `${window.location.origin}/cart` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Checkout failed');
      const url = data?.authorization_url || data?.data?.authorization_url;
      if (!url) throw new Error('No Paystack URL returned');
      window.location.href = url;
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Checkout failed');
      setBusy(false);
    }
  };

  if (!cart.length && !notice) {
    return (
      <div className={`container ${styles.empty}`}>
        <h1 className="display h2">Your bag is empty</h1>
        <p className="muted">Discover soft luxury pieces made to glow.</p>
        <Link href="/shop" className="btn">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className="display h2">Checkout</h1>
      {notice && <p className={styles.notice}>{notice}</p>}

      <div className={styles.grid}>
        <div className={styles.items}>
          {cart.map((item) => (
            <article key={`${item.id}-${item.size}`}>
              <div className={styles.thumb}>
                {item.image ? <Image src={item.image} alt="" width={80} height={100} unoptimized /> : null}
              </div>
              <div>
                <strong>{item.name}</strong>
                <p className="muted">
                  Size {item.size}
                  {item.color ? ` · ${item.color}` : ''}
                </p>
                <p>{formatNaira(item.price)}</p>
                <div className={styles.qty}>
                  <button type="button" onClick={() => updateQty(item.id, item.size, item.qty - 1)}>-</button>
                  <span>{item.qty}</span>
                  <button type="button" onClick={() => updateQty(item.id, item.size, item.qty + 1)}>+</button>
                  <button type="button" onClick={() => removeFromCart(item.id, item.size)}>
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className={styles.summary}>
          <h2>Delivery & payment</h2>
          <label className="field">
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label className="field">
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required />
          </label>
          <label className="field">
            Address
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} required />
          </label>
          <label className="field">
            Delivery zone
            <select
              value={zoneId}
              onChange={(e) => {
                setZoneId(e.target.value);
                storage.setZone(e.target.value);
              }}
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label} — {formatNaira(z.fee)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </label>

          <div className={styles.totals}>
            <div><span>Subtotal</span><span>{formatNaira(cartSubtotal)}</span></div>
            <div><span>Delivery</span><span>{formatNaira(delivery)}</span></div>
            <div className={styles.total}><span>Total</span><strong>{formatNaira(total)}</strong></div>
          </div>

          <button type="button" className="btn" disabled={busy || !cart.length} onClick={checkout}>
            {busy ? 'Processing…' : 'Pay with Paystack'}
          </button>
          <a
            className="btn btn--whatsapp"
            href={whatsappUrl(cartWhatsAppMessage(cart, typeof window !== 'undefined' ? window.location.origin : 'https://mbplingerie.com.ng'))}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent('whatsapp_click', { source: 'cart_page' })}
          >
            Order entire bag on WhatsApp
          </a>
        </aside>
      </div>
    </div>
  );
}
