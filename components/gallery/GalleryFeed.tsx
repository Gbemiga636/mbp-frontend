'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Volume2, VolumeX } from 'lucide-react';
import type { GalleryItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { trackEvent } from '@/lib/api';
import styles from './GalleryFeed.module.css';

const FALLBACK: GalleryItem[] = [
  { id: 'vid-2', type: 'video', src: '/assets/mbpvid2.mp4', caption: 'On film' },
  { id: 'img-l1', type: 'image', src: '/assets/lingerie1.jpeg', caption: 'Lingerie' },
  { id: 'vid-1', type: 'video', src: '/assets/mbpvid1.mp4', caption: 'Movement' },
  { id: 'img-n1', type: 'image', src: '/assets/nightwear1.jpeg', caption: 'Nightwear' },
  { id: 'img-silk', type: 'image', src: '/assets/mbp-editorial-silk.png', caption: 'Silk' },
  { id: 'img-l4', type: 'image', src: '/assets/lingerie4.jpeg', caption: 'Evening glow' },
  { id: 'img-n3', type: 'image', src: '/assets/nightwear3.jpeg', caption: 'Soft nights' },
  { id: 'img-lace', type: 'image', src: '/assets/mbp-editorial-lace.png', caption: 'Lace' },
  { id: 'img-u1', type: 'image', src: '/assets/underwear1.jpeg', caption: 'Essentials' },
  { id: 'img-pic', type: 'image', src: '/assets/Pic.png', caption: 'The house' },
];

function isVideo(item: GalleryItem, src: string) {
  if (item.type === 'video') return true;
  return /\.(mp4|mov|webm)(\?|$)/i.test(src);
}

export function GalleryFeed({ items }: { items: GalleryItem[] }) {
  const feed = (items.length ? items : FALLBACK).map((item) => ({
    ...item,
    src: resolveMediaUrl(item.src),
  }));
  const [muted, setMuted] = useState(true);
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const refs = useRef<(HTMLElement | null)[]>([]);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const nodes = refs.current.filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.index);
          const video = videos.current[index];
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            setActive(index);
            if (video) {
              video.muted = muted;
              video.play().catch(() => null);
            }
          } else if (video) {
            video.pause();
          }
        });
      },
      { threshold: [0.6, 0.85] }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [feed.length, muted]);

  useEffect(() => {
    videos.current.forEach((video, i) => {
      if (!video) return;
      video.muted = muted;
      if (i === active) video.play().catch(() => null);
    });
  }, [muted, active]);

  return (
    <div className={styles.page}>
      <div className={styles.feed} aria-label="MBP gallery feed">
        {feed.map((item, i) => {
          const src = item.src;
          const video = isVideo(item, src);
          return (
            <article
              key={item.id || src + i}
              className={styles.slide}
              data-index={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
            >
              {video ? (
                <video
                  ref={(el) => {
                    videos.current[i] = el;
                  }}
                  className={styles.media}
                  src={src}
                  loop
                  playsInline
                  muted={muted}
                  preload={i < 2 ? 'auto' : 'metadata'}
                />
              ) : (
                <Image className={styles.media} src={src} alt={item.caption || 'MBP look'} fill sizes="100vw" unoptimized />
              )}
              <div className={styles.shade} />
              <div className={styles.meta}>
                <p className={styles.kicker}>MBP</p>
                <h2 className="display">{item.caption || 'The MBP world'}</h2>
                <p>{i + 1} / {feed.length}</p>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  aria-label="Save"
                  className={saved[item.id] ? styles.loved : ''}
                  onClick={() => setSaved((s) => ({ ...s, [item.id]: !s[item.id] }))}
                >
                  <Heart size={22} fill={saved[item.id] ? 'currentColor' : 'none'} />
                </button>
                {video && (
                  <button type="button" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted((m) => !m)}>
                    {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                  </button>
                )}
                <a
                  href={`https://wa.me/2348087504905?text=${encodeURIComponent('Hello MBP Lingerie, I saw something in the gallery and need help.')}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  onClick={() => trackEvent('whatsapp_click', { source: 'gallery' })}
                >
                  <MessageCircle size={22} />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
