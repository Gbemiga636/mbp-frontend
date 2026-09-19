'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight, MessageCircle, Ruler } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { HomeContent, Product } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { CATEGORIES } from '@/lib/types';
import { DEFAULT_REVIEWS, catalogImages, imageByCategory } from '@/lib/defaults';
import { Reveal } from '@/components/home/Reveal';
import { SilkScene } from '@/components/experience/SilkScene';
import { Spinner } from '@/components/ui/Spinner';
import styles from './home.module.css';

const WORDS = ['Luxury.', 'Confidence.', 'You.'];
const HERO_VIDEO = '/assets/home-hero-video.mp4';
const BAND_FALLBACK = '/assets/mbpvid1.mp4';

const CATEGORY_VISUALS: Record<string, { image: string; blurb: string }> = {
  lingerie: { image: '/assets/lingerie1.jpeg', blurb: 'Sets that photograph like couture' },
  underwear: { image: '/assets/underwear1.jpeg', blurb: 'Everyday essentials, elevated' },
  nightwear: { image: '/assets/nightwear1.jpeg', blurb: 'Soft nights, sharp presence' },
  pyjamas: { image: '/assets/nightwear3.jpeg', blurb: 'Lounge luxury, all day' },
};

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
            <Image src={src} alt="" fill sizes="(max-width:768px) 80vw, 28vw" unoptimized />
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
  const [heroReady, setHeroReady] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '22%']);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.12]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-8%']);

  const featured = home.featured?.length ? home.featured : products.slice(0, 10);
  const newest = products.slice(0, 10);
  const reviews = home.reviews?.length ? home.reviews : DEFAULT_REVIEWS;
  const bandVideo = String(home.bandVideo || '').trim() || BAND_FALLBACK;
  const wardrobe = CATEGORIES.map((c) => ({
    ...c,
    ...CATEGORY_VISUALS[c.slug],
    image: imageByCategory(products, c.slug, CATEGORY_VISUALS[c.slug]?.image || '/assets/lingerie1.jpeg'),
  }));
  const world = catalogImages(products, ATMOSPHERE, 8);
  const editorialImage = imageByCategory(products, 'lingerie', '/assets/lingerie2.jpeg');
  const fitImage = imageByCategory(products, 'nightwear', '/assets/nightwear1.jpeg');

  return (
    <div className={styles.experience}>
      <SilkScene className={styles.silk} />

      <section className={styles.hero} ref={heroRef} aria-label="Hero">
        <motion.div className={styles.heroMedia} style={{ y: heroY, scale: heroScale }}>
          <video
            className={styles.heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={() => setHeroReady(true)}
            onCanPlay={() => setHeroReady(true)}
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        </motion.div>
        <div className={styles.heroOverlay} />
        <div className={styles.heroDepth} aria-hidden />
        {!heroReady ? (
          <div className={styles.heroSpin}>
            <Spinner label="Opening the film" light />
          </div>
        ) : null}
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

      <div className={styles.marquee} aria-hidden>
        <div className={styles.marqueeTrack}>
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i}>
              Luxury · Confidence · You · Soft power · Discreet delivery · Fit on WhatsApp · MBP Lingerie ·{' '}
            </span>
          ))}
        </div>
      </div>

      <section id="discover" className={styles.intents}>
        <div className="container">
          <Reveal>
            <p className={styles.eyebrow}>Begin here</p>
            <h2 className="display h2">What are you looking for?</h2>
          </Reveal>
          <div className={styles.intentRow}>
            {wardrobe.map((item, i) => (
              <Reveal key={item.slug} delay={i * 0.06} y={24}>
                <Link href={`/shop/${item.slug}`} data-cursor="Explore">
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {item.name}
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.moods}>
        <Reveal y={28}>
          <Link href="/shop/lingerie" className={styles.mood} data-cursor="Explore">
            <Image src="/assets/lingerie3.jpeg" alt="" fill sizes="50vw" unoptimized />
            <div>
              <p>The everyday</p>
              <h3 className="display">Soft enough to forget. Fine enough to keep.</h3>
            </div>
          </Link>
        </Reveal>
        <Reveal delay={0.08} y={28}>
          <Link href="/shop/lingerie" className={styles.mood} data-cursor="Explore">
            <Image src={imageByCategory(products, 'lingerie', '/assets/lingerie4.jpeg')} alt="" fill sizes="50vw" unoptimized />
            <div>
              <p>After dark</p>
              <h3 className="display">Lace, satin, and a little more intention.</h3>
            </div>
          </Link>
        </Reveal>
      </section>

      <section className={styles.section}>
        <div className={`container ${styles.sectionHead}`}>
          <Reveal>
            <p className={styles.eyebrow}>The wardrobe</p>
            <h2 className="display h2">Four ways to begin.</h2>
          </Reveal>
          <Link href="/shop" className={styles.textLink}>
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className={`container ${styles.catGrid}`}>
          {wardrobe.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.07}>
              <Link href={`/shop/${c.slug}`} className={styles.catTile}>
                <div className={styles.catImg}>
                  <Image src={c.image} alt={c.name} fill sizes="(max-width:768px) 50vw, 25vw" unoptimized />
                </div>
                <div className={styles.catShade} aria-hidden />
                <div className={styles.catCopy}>
                  <span className="display">{c.name}</span>
                  <p>{c.blurb}</p>
                  <span className={styles.catCta}>Shop</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHead}>
          <Reveal>
            <p className={styles.eyebrow}>The edit</p>
            <h2 className="display h2">Featured this season</h2>
          </Reveal>
          <Link href="/shop" className={styles.textLink}>
            Shop featured <ArrowRight size={16} />
          </Link>
        </div>
        <Reveal>
          <ProductRail products={featured} label="Swipe" />
        </Reveal>
      </section>

      <section className={styles.editorial}>
        <div className={styles.editorialMedia}>
          <Image src={editorialImage} alt="MBP editorial mood" fill sizes="(max-width:900px) 100vw, 50vw" unoptimized />
        </div>
        <Reveal className={styles.editorialCopy} delay={0.08}>
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
        </Reveal>
      </section>

      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHead}>
          <Reveal>
            <p className={styles.eyebrow}>Just in</p>
            <h2 className="display h2">New arrivals</h2>
          </Reveal>
          <Link href="/shop" className={styles.textLink}>
            See what&apos;s new <ArrowRight size={16} />
          </Link>
        </div>
        <Reveal>
          <ProductRail products={newest} label="New" />
        </Reveal>
      </section>

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

      <section className={styles.fitBand}>
        <div className={`container ${styles.fitInner}`}>
          <Reveal>
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
          </Reveal>
          <Reveal className={styles.fitVisual} delay={0.08}>
            <Image src={fitImage} alt="MBP nightwear" fill sizes="(max-width:900px) 100vw, 40vw" unoptimized />
          </Reveal>
        </div>
      </section>

      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHead}>
          <Reveal>
            <p className={styles.eyebrow}>Voices</p>
            <h2 className="display h2">Loved by her</h2>
          </Reveal>
        </div>
        <Reveal>
          <ReviewRail reviews={reviews} />
        </Reveal>
      </section>

      <section className={styles.collageSection}>
        <div className={`container ${styles.sectionHead}`}>
          <Reveal>
            <p className={styles.eyebrow}>Atmosphere</p>
            <h2 className="display h2">The MBP world</h2>
          </Reveal>
          <Link href="/gallery" className={styles.textLink}>
            Open gallery <ArrowRight size={16} />
          </Link>
        </div>
        <div className="container">
          <Reveal>
            <AtmosphereCarousel images={world} />
          </Reveal>
        </div>
      </section>

      <section className={styles.concierge}>
        <div className="container">
          <Reveal>
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
          </Reveal>
        </div>
      </section>

      <section className={`container ${styles.finalCta}`}>
        <Reveal>
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
        </Reveal>
      </section>
    </div>
  );
}
