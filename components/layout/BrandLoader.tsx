'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './BrandLoader.module.css';

export function BrandLoader() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem('mbp_loader_seen');
    if (seen) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => {
      setExiting(true);
      window.setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem('mbp_loader_seen', '1');
      }, 700);
    }, 2600);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className={`${styles.loader} ${exiting ? styles.exit : ''}`} role="status" aria-label="Loading MBP Lingerie">
      <div className={styles.glow} aria-hidden />
      <div className={styles.mark}>
        <Image src="/assets/Logo.PNG" alt="MBP Lingerie" width={110} height={110} priority />
        <svg className={styles.silhouette} viewBox="0 0 120 160" aria-hidden>
          <defs>
            <linearGradient id="lingerieGold" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#8f6c38" />
              <stop offset="55%" stopColor="#d4b57a" />
              <stop offset="100%" stopColor="#fff3d2" />
            </linearGradient>
            <clipPath id="lingerieClip">
              <path d="M28 38c8-16 22-22 32-22s24 6 32 22c6 12 8 22 6 34-8 4-16 8-20 18-2 6-2 14 0 22 2 10 6 22 4 32H38c-2-10 2-22 4-32 2-8 2-16 0-22-4-10-12-14-20-18-2-12 0-22 6-34z" />
            </clipPath>
          </defs>
          <path
            className={styles.outline}
            d="M28 38c8-16 22-22 32-22s24 6 32 22c6 12 8 22 6 34-8 4-16 8-20 18-2 6-2 14 0 22 2 10 6 22 4 32H38c-2-10 2-22 4-32 2-8 2-16 0-22-4-10-12-14-20-18-2-12 0-22 6-34z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <g clipPath="url(#lingerieClip)">
            <rect className={styles.fill} x="0" y="0" width="120" height="160" fill="url(#lingerieGold)" />
          </g>
        </svg>
      </div>
      <div className={styles.letters} aria-hidden>
        <span>M</span>
        <span>B</span>
        <span>P</span>
      </div>
      <p className={styles.hint}>Elegance is dressing…</p>
    </div>
  );
}
