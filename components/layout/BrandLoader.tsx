'use client';

import { useEffect, useState } from 'react';
import styles from './BrandLoader.module.css';

export function BrandLoader() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem('mbp_loader_v5');
    if (seen) {
      setVisible(false);
      return;
    }
    const hold = window.setTimeout(() => {
      setExiting(true);
      window.setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem('mbp_loader_v5', '1');
      }, 650);
    }, 2800);
    return () => window.clearTimeout(hold);
  }, []);

  if (!visible) return null;

  return (
    <div className={`${styles.loader} ${exiting ? styles.exit : ''}`} role="status" aria-label="Loading MBP Lingerie">
      <div className={styles.glow} aria-hidden />

      <div className={styles.card}>
        <svg className={styles.frame} viewBox="0 0 260 340" fill="none" aria-hidden>
          <rect x="1.5" y="1.5" width="257" height="337" rx="1" />
        </svg>

        <img className={styles.logo} src="/assets/Logo.PNG" alt="MBP Lingerie" />

        <p className={styles.monogram}>
          <span>M</span>
          <span>B</span>
          <span>P</span>
        </p>

        <i className={styles.rule} aria-hidden />
        <p className={styles.word}>Lingerie</p>
      </div>

      <span className={styles.hint}>The house is opening</span>
      <i className={styles.progress} aria-hidden />
    </div>
  );
}
