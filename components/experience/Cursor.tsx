'use client';

import { useEffect, useState } from 'react';
import styles from './Cursor.module.css';

export function ExperienceCursor() {
  const [pos, setPos] = useState({ x: -80, y: -80 });
  const [label, setLabel] = useState('');
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setOn(true);
    const move = (e: PointerEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      const el = (e.target as HTMLElement | null)?.closest?.('[data-cursor]') as HTMLElement | null;
      setLabel(el?.dataset.cursor || '');
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  if (!on) return null;

  return (
    <div
      className={`${styles.cursor} ${label ? styles.hot : ''}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      aria-hidden
    >
      <i />
      {label ? <span>{label}</span> : null}
    </div>
  );
}
