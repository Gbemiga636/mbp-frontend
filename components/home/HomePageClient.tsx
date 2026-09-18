'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Gift,
  MessageCircle,
  Ruler,
  Sparkles,
  Truck,
} from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { HomeContent, Product } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { CATEGORIES } from '@/lib/types';
import styles from './home.module.css';

const WORDS = ['Luxury.', 'Confidence.', 'You.'];
const HERO_FALLBACK = '/assets/home-hero-video.mp4';
const BAND_FALLBACK = '/assets/mbpvid1.mp4';
const MAIN_HERO_VIDEO =
  'https://xyuqcztzktqladitoell.supabase.co/storage/v1/object/public/mbp/migrated/home-hero-video.mov';

const CATEGORY_VISUALS: Record<string, { image: string; blurb: string }> = {
  lingerie: { image: '/assets/lingerie1.jpeg', blurb: 'Sets that photograph like couture' },
  underwear: { image: '/assets/underwear1.jpeg', blurb: 'Everyday essentials, elevated' },
  nightwear: { image: '/assets/nightwear1.jpeg', blurb: 'Soft nights, sharp presence' },
  pyjamas: { image: '/assets/nightwear3.jpeg', blurb: 'Lounge luxury, all day' },
};

const MOMENTS = [
  {
    title: 'Evening Glow',
    text: 'Lace, satin, and silhouettes made for after dark.',
    href: '/shop/lingerie',
    image: '/assets/lingerie4.jpeg',
  },
  {
    title: 'Quiet Luxury',
    text: 'Second-skin fabrics that feel expensive before anyone sees them.',
    href: '/shop/underwear',
    image: '/assets/underwear1.jpeg',
  },
  {
    title: 'Night Ritual',
    text: 'Sleepwear that turns wind-down into a ceremony.',
    href: '/shop/nightwear',
    image: '/assets/nightwear5.jpeg',
  },
];

const ATMOSPHERE = [
  '/assets/lingerie1.jpeg',
  '/assets/nightwear1.jpeg',
  '/assets/lingerie4.jpeg',
  '/assets/nightwear3.jpeg',
  '/assets/Pic.png',
  '/assets/nightwear5.jpeg',
  '/assets/underwear1.jpeg',
];

function Typewriter({ reduce }: { reduce: boolean | null }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(reduce ? WORDS[0] : '');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduce) {
      setText(WORDS[0]);
      return;
    }
    const word = WORDS[index % WORDS.length];
    let timeout: number;
    if (!deleting && text === word) {
      timeout = window.setTimeout(() => setDeleting(true), 1500);
    } else if (deleting && text.length === 0) {
      timeout = window.setTimeout(() => {
        setDeleting(false);
        setIndex((i) => (i + 1) % WORDS.length);
      }, 180);
    } else {
      timeout = window.setTimeout(() => {
        const next = text.length + (deleting ? -1 : 1);
        setText(word.slice(0, next));
      }, deleting ? 46 : 88);
    }
    return () => window.clearTimeout(timeout);
  }, [text, deleting, index, reduce]);

  return (
    <span className={styles.typed} aria-live="polite">
      {text}
      <span className={styles.caret} aria-hidden />
    </span>
  );
}

function ReviewRail({ reviews }: { reviews: { id: string; text: string; meta: string }[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const looped = reviews.length ? [...reviews, ...reviews, ...reviews] : [];
  const scrollBy = (dir: number) => {
    scroller.current?.scrollBy({ left: dir * Math.min(340, window.innerWidth * 0.8), behavior: 'smooth' });
  };

  useEffect(() => {
    const el = scroller.current;
    if (!el || reviews.length < 2) return;
    const t = window.setInterval(() => {
      if (paused.current) return;
      const max = el.scrollWidth - el.clientWidth - 12;
      if (el.scrollLeft >= max) el.scrollTo({ left: 0, behavior: 'smooth' });
      else scrollBy(1);
    }, 3800);
    return () => window.clearInterval(t);
  }, [reviews.length]);

  return (
    <div className={styles.reviewWrap}>
      <div className={styles.reviewControls}>
        <button type="button" aria-label="Previous review" onClick={() => scrollBy(-1)}>
          <ChevronLeft size={18} />
        </button>
        <button type="button" aria-label="Next review" onClick={() => scrollBy(1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div
        className={styles.reviewRail}
        ref={scroller}
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; }}
        onTouchStart={() => { paused.current = true; }}
      >
        {looped.map((r, i) => (
          <article key={`${r.id}-${i}`} className={styles.review}>
            <div className={styles.stars} aria-hidden>
              ★★★★★
            </div>
            <p>“{r.text}”</p>
            <span className="muted">{r.meta}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function AtmosphereCarousel({ images }: { images: string[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const scrollBy = (dir: number) => {
    scroller.current?.scrollBy({ left: dir * Math.min(320, window.innerWidth * 0.78), behavior: 'smooth' });
  };

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const t = window.setInterval(() => {
      if (paused.current) return;
      const max = el.scrollWidth - el.clientWidth - 12;
      if (el.scrollLeft >= max) el.scrollTo({ left: 0, behavior: 'smooth' });
      else scrollBy(1);
    }, 3400);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className={styles.atmosphere}>
      <div className={styles.reviewControls}>
        <button type="button" aria-label="Previous look" onClick={() => scrollBy(-1)}>
          <ChevronLeft size={18} />
        </button>
        <button type="button" aria-label="Next look" onClick={() => scrollBy(1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div
        className={styles.atmosphereRail}
        ref={scroller}
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; }}
        onTouchStart={() => { paused.current = true; }}
      >
        {images.map((src) => (
          <figure key={src} className={styles.atmosphereSlide}>
            <Image src={src} alt="" fill sizes="(max-width:768px) 80vw, 28vw" />
          </figure>
        ))}
      </div>
    </div>
  );
}

function ProductRail({ products, label }: { products: Product[]; label: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) => {
    scroller.current?.scrollBy({ left: dir * Math.min(320, window.innerWidth * 0.75), behavior: 'smooth' });
  };

  if (!products.length) return null;

  return (
    <div className={styles.railWrap}>
      <div className={styles.railControls}>
        <span className={styles.railLabel}>{label}</span>
        <div>
          <button type="button" aria-label="Scroll left" onClick={() => scrollBy(-1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Scroll right" onClick={() => scrollBy(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className={styles.rail} ref={scroller}>
        {products.map((p) => (
          <div key={p.id} className={styles.railItem}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomePageClient({
  home,
  products,
}: {
  home: HomeContent;
  products: Product[];
}) {
  const reduce = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '22%']);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.12]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-8%']);

  const featured = home.featured?.length ? home.featured : products.slice(0, 10);
  const bestsellers = products.filter((p) => p.badges?.includes('bestseller')).slice(0, 10);
  const newest = products.slice(0, 10);
  const lookProducts = products.slice(8, 14);
  const heroVideo = String(home.heroVideo || '').trim() || MAIN_HERO_VIDEO;
  const bandVideo = String(home.bandVideo || '').trim() || BAND_FALLBACK;

  return (
    <div className={styles.experience}>
      {/* 1. Cinematic hero */}
      <section className={styles.hero} ref={heroRef} aria-label="Hero">
        <motion.div className={styles.heroMedia} style={{ y: heroY, scale: heroScale }}>
          {!videoFailed ? (
            <video
              className={styles.heroVideo}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/assets/Collage.png"
              onError={() => setVideoFailed(true)}
            >
              <source src={heroVideo} type={heroVideo.includes('.mov') ? 'video/quicktime' : 'video/mp4'} />
              {heroVideo !== HERO_FALLBACK ? <source src={HERO_FALLBACK} type="video/mp4" /> : null}
            </video>
          ) : (
            <Image src="/assets/Collage.png" alt="" fill priority className={styles.heroImg} sizes="100vw" />
          )}
        </motion.div>
        <div className={styles.heroOverlay} />
        <div className={styles.heroDepth} aria-hidden />
        <motion.div className={`container ${styles.heroContent}`} style={{ y: contentY }}>
          <motion.p
            className={styles.kicker}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            The house of soft luxury
          </motion.p>
          <h1 className={`display ${styles.title}`}>
            <span className={styles.brandLine}>Made for</span>
            <Typewriter reduce={reduce} />
          </h1>
          <p className={styles.sub}>Intimacywear designed with intention — quiet power, precise fit, discreet delivery.</p>
          <div className={styles.cta}>
            <Link href="/shop" className="btn">
              Enter the collection <ArrowRight size={16} />
            </Link>
            <a className="btn btn--ghost" href="https://wa.me/2348087504905" target="_blank" rel="noreferrer">
              <MessageCircle size={16} /> WhatsApp stylist
            </a>
          </div>
          <a href="#discover" className={styles.scroll} aria-label="Scroll to discover">
            <ArrowDown size={16} />
            <span>Scroll to enter</span>
          </a>
        </motion.div>
      </section>

      {/* 2. Marquee */}
      <div className={styles.marquee} aria-hidden>
        <div className={styles.marqueeTrack}>
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i}>
              Luxury · Confidence · You · Soft power · Discreet delivery · Fit on WhatsApp · MBP Lingerie ·{' '}
            </span>
          ))}
        </div>
      </div>

      {/* 3. Trust / promise strip */}
      <section id="discover" className={styles.promiseBand}>
        <div className={`container ${styles.promiseHead}`}>
          <p className={styles.eyebrow}>The promise</p>
          <h2 className="display h2">Made to arrive beautifully.</h2>
          <p className={styles.promiseLead}>
            Four quiet standards behind every MBP piece — from the first unboxing to the last wear.
          </p>
        </div>
        <div className={`container ${styles.promises}`}>
          {[
            { n: '01', icon: Truck, title: 'Discreet delivery', text: 'Lagos zones, privacy-first packaging, no spectacle on the doorstep.' },
            { n: '02', icon: Ruler, title: 'Fit guidance', text: 'A stylist on WhatsApp, real measurements, never guesswork.' },
            { n: '03', icon: Sparkles, title: 'Editorial pieces', text: 'Fabrics and cuts that feel expensive on skin and on camera.' },
            { n: '04', icon: Gift, title: 'Ready to gift', text: 'Soft unboxing, every order — for her, or for you.' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                className={styles.promise}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
              >
                <span className={styles.promiseNum}>{item.n}</span>
                <span className={styles.promiseIcon}><Icon size={18} strokeWidth={1.5} /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* 4. Shop by category — immersive tiles */}
      <section className={styles.section}>
        <div className={`container ${styles.sectionHead}`}>
          <div>
            <p className={styles.eyebrow}>The wardrobe</p>
            <h2 className="display h2">Four ways to begin.</h2>
          </div>
          <Link href="/shop" className={styles.textLink}>
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className={`container ${styles.catGrid}`}>
          {CATEGORIES.map((c, i) => {
            const visual = CATEGORY_VISUALS[c.slug];
            return (
              <motion.div
                key={c.slug}
                initial={reduce ? false : { opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.55 }}
              >
                <Link href={`/shop/${c.slug}`} className={styles.catTile}>
                  <div className={styles.catImg}>
                    <Image src={visual.image} alt={c.name} fill sizes="(max-width:768px) 50vw, 25vw" />
                  </div>
                  <div className={styles.catShade} aria-hidden />
                  <div className={styles.catCopy}>
                    <span className="display">{c.name}</span>
                    <p>{visual.blurb}</p>
                    <span className={styles.catCta}>Shop</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 5. Featured rail */}
      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>The edit</p>
            <h2 className="display h2">Featured this season</h2>
          </div>
          <Link href="/shop" className={styles.textLink}>
            Shop featured <ArrowRight size={16} />
          </Link>
        </div>
        <ProductRail products={featured} label="Swipe" />
      </section>

      {/* 6. Editorial split */}
      <section className={styles.editorial}>
        <div className={styles.editorialMedia}>
          <Image src="/assets/lingerie2.jpeg" alt="MBP editorial mood" fill sizes="(max-width:900px) 100vw, 50vw" />
        </div>
        <div className={styles.editorialCopy}>
          <p className={styles.eyebrow}>The house</p>
          <h2 className="display h2">Designed for every private moment.</h2>
          <p>
            MBP Lingerie is built for Nigerian women who want intimacywear that feels expensive,
            photographs beautifully, and arrives discreetly. Fit guidance on WhatsApp whenever you need it.
          </p>
          <div className={styles.cta}>
            <Link href="/about" className="btn btn--gold">
              Our story
            </Link>
            <Link href="/size-guide" className="btn btn--ghost">
              Find my size
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Style chapters */}
      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Chapters</p>
            <h2 className="display h2">Shop the mood</h2>
          </div>
        </div>
        <div className={styles.moments}>
          {MOMENTS.map((m, i) => (
            <motion.div
              key={m.title}
              className={styles.moment}
              initial={reduce ? false : { opacity: 0, rotateX: 8, y: 30 }}
              whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
            >
              <Link href={m.href}>
                <div className={styles.momentImg}>
                  <Image src={m.image} alt={m.title} fill sizes="(max-width:768px) 100vw, 33vw" />
                </div>
                <div className={styles.momentCopy}>
                  <h3 className="display">{m.title}</h3>
                  <p>{m.text}</p>
                  <span>
                    Explore <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 8. New arrivals */}
      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Just in</p>
            <h2 className="display h2">New arrivals</h2>
          </div>
          <Link href="/shop" className={styles.textLink}>
            See what&apos;s new <ArrowRight size={16} />
          </Link>
        </div>
        <ProductRail products={newest} label="New" />
      </section>

      {/* 9. Parallax video band */}
      <section className={styles.band} aria-label="Ambient film">
        <video autoPlay muted loop playsInline preload="metadata">
          <source src={bandVideo} type="video/mp4" />
        </video>
        <div className={styles.bandOverlay} />
        <div className={styles.bandCopy}>
          <p className={styles.kicker}>MBP on film</p>
          <h2 className="display h2">Feel the fabric move.</h2>
          <Link href="/gallery" className="btn btn--ghost">
            Enter gallery
          </Link>
        </div>
      </section>

      {/* 10. Best sellers / more products */}
      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Most loved</p>
            <h2 className="display h2">{bestsellers.length ? 'Best sellers' : 'Complete the look'}</h2>
          </div>
          <Link href="/shop" className={styles.textLink}>
            Shop all <ArrowRight size={16} />
          </Link>
        </div>
        <ProductRail products={bestsellers.length ? bestsellers : lookProducts} label="Loved" />
      </section>

      {/* 11. Fit experience */}
      <section className={styles.fitBand}>
        <div className={`container ${styles.fitInner}`}>
          <div>
            <p className={styles.eyebrow}>Fit</p>
            <h2 className="display h2">Not sure of your size?</h2>
            <p className="muted">
              Use our size guide or message a stylist — we recommend based on real measurements, never guesswork.
            </p>
            <div className={styles.cta}>
              <Link href="/size-guide" className="btn">
                <Ruler size={16} /> Size guide
              </Link>
              <a
                className="btn btn--whatsapp"
                href="https://wa.me/2348087504905?text=Hello%20MBP%20Lingerie%2C%20I%20need%20help%20finding%20my%20size."
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={16} /> Ask on WhatsApp
              </a>
            </div>
          </div>
          <div className={styles.fitVisual}>
            <Image src="/assets/Pic.png" alt="MBP fit mood" fill sizes="(max-width:900px) 100vw, 40vw" />
          </div>
        </div>
      </section>

      {/* 12. Reviews */}
      {(home.reviews?.length || 0) > 0 && (
        <section className={`container ${styles.section}`}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Voices</p>
              <h2 className="display h2">Loved by her</h2>
            </div>
          </div>
          <ReviewRail reviews={home.reviews!} />
        </section>
      )}

      {/* 13. Visual collage / social */}
      <section className={styles.collageSection}>
        <div className={`container ${styles.sectionHead}`}>
          <div>
            <p className={styles.eyebrow}>Atmosphere</p>
            <h2 className="display h2">The MBP world</h2>
          </div>
          <Link href="/gallery" className={styles.textLink}>
            Open gallery <ArrowRight size={16} />
          </Link>
        </div>
        <div className="container">
          <AtmosphereCarousel images={ATMOSPHERE} />
        </div>
      </section>

      {/* 14. Concierge */}
      <section className={styles.concierge}>
        <div className="container">
          <p className={styles.eyebrow}>Concierge</p>
          <h2 className="display h2">Private styling on WhatsApp</h2>
          <p>
            Tell us the occasion, your usual size, and what you love — we&apos;ll guide you to pieces that fit
            and feel like you.
          </p>
          <a
            className="btn btn--whatsapp"
            href="https://wa.me/2348087504905?text=Hello%20MBP%20Lingerie%2C%20I%20want%20a%20personal%20style%20consult."
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} /> Chat with MBP
          </a>
        </div>
      </section>

      {/* 15. Newsletter + final CTA */}
      <section className={`container ${styles.finalCta}`}>
        <h2 className="display h2">Stay close to the drop.</h2>
        <p className="muted">Private launches, restocks, and fit tips — straight to your inbox.</p>
        <form
          className={styles.newsForm}
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
            alert('You are on the list.');
          }}
        >
          <label className="sr-only" htmlFor="home-news">
            Email
          </label>
          <input id="home-news" name="email" type="email" required placeholder="Your email" />
          <button className="btn" type="submit">
            Join
          </button>
        </form>
        <div className={styles.cta}>
          <Link href="/shop" className="btn btn--gold">
            Shop now
          </Link>
          <Link href="/contact" className="btn btn--ghost">
            Contact
          </Link>
        </div>
      </section>
    </div>
  );
}
