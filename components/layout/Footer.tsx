'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Mail, MapPin, MessageCircle } from 'lucide-react';
import styles from './Footer.module.css';

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  return (
    <footer className={styles.footer}>
      <div className={styles.glow} aria-hidden />
      <div className={`container ${styles.top}`}>
        <Image src="/assets/Logo.PNG" alt="MBP Lingerie" width={78} height={78} />
        <p className={`display ${styles.wordmark}`}>Luxury. Confidence. You.</p>
        <p className={styles.tag}>Soft luxury for bold women — discreet, fitted, unforgettable.</p>
      </div>

      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <h3>The house</h3>
          <p>
            MBP Lingerie is intimacywear made to glow on skin and on camera. Fit guidance on WhatsApp,
            private packaging, and pieces that feel expensive before anyone sees them.
          </p>
          <div className={styles.social}>
            <a href="mailto:hello@mbplingerie.com.ng" aria-label="Email">
              <Mail size={18} />
            </a>
            <a
              href="https://wa.me/2348087504905?text=Hello%20MBP%20Lingerie%2C%20I%20need%20assistance."
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
            >
              <MessageCircle size={18} />
            </a>
          </div>
        </div>

        <div>
          <h3>Shop</h3>
          <Link href="/shop">All products</Link>
          <Link href="/shop/lingerie">Lingerie</Link>
          <Link href="/shop/underwear">Underwear</Link>
          <Link href="/shop/nightwear">Nightwear</Link>
          <Link href="/shop/pyjamas">Pyjamas</Link>
          <Link href="/gallery">Gallery</Link>
        </div>

        <div>
          <h3>Care</h3>
          <Link href="/size-guide">Size guide</Link>
          <Link href="/about">Our story</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>

        <div>
          <h3>Stay close</h3>
          <p className={styles.note}>
            <MapPin size={14} /> Lagos · discreet delivery
          </p>
          <a
            className="btn btn--whatsapp"
            href="https://wa.me/2348087504905?text=Hello%20MBP%20Lingerie%2C%20I%20need%20assistance."
            target="_blank"
            rel="noreferrer"
          >
            Chat on WhatsApp
          </a>
          <form
            className={styles.news}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const email = String(fd.get('email') || '');
              if (!email) return;
              fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
              }).catch(() => null);
              e.currentTarget.reset();
              alert('Thank you — you are on the list.');
            }}
          >
            <label className="sr-only" htmlFor="newsletter">Email</label>
            <input id="newsletter" name="email" type="email" required placeholder="Email for private drops" />
            <button className="btn btn--gold" type="submit">Join</button>
          </form>
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <span>© {new Date().getFullYear()} MBP Lingerie</span>
        <span className={styles.promise}>Discreet packaging · Soft luxury, made to glow</span>
        <span>Nigeria</span>
      </div>
    </footer>
  );
}
