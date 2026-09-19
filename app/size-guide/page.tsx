'use client';

import { useMemo, useState } from 'react';
import { PageIntro } from '@/components/layout/PageIntro';
import styles from './size-guide.module.css';

const RULES = [
  { size: 'S', bustMin: 76, bustMax: 84, waistMin: 58, waistMax: 66, hipMin: 84, hipMax: 92 },
  { size: 'M', bustMin: 84, bustMax: 92, waistMin: 66, waistMax: 74, hipMin: 92, hipMax: 100 },
  { size: 'L', bustMin: 92, bustMax: 100, waistMin: 74, waistMax: 82, hipMin: 100, hipMax: 108 },
  { size: 'XL', bustMin: 100, bustMax: 110, waistMin: 82, waistMax: 92, hipMin: 108, hipMax: 118 },
];

export default function SizeGuidePage() {
  const [bust, setBust] = useState('');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');

  const suggestion = useMemo(() => {
    const b = Number(bust);
    const w = Number(waist);
    const h = Number(hip);
    if (!b && !w && !h) return null;
    const scored = RULES.map((r) => {
      let score = 0;
      if (b && b >= r.bustMin && b <= r.bustMax) score += 2;
      if (w && w >= r.waistMin && w <= r.waistMax) score += 2;
      if (h && h >= r.hipMin && h <= r.hipMax) score += 2;
      return { size: r.size, score };
    }).sort((a, b) => b.score - a.score);
    return scored[0]?.score > 0 ? scored[0].size : 'Chat with us on WhatsApp for a personal fit';
  }, [bust, waist, hip]);

  return (
    <div className={`container ${styles.page}`}>
      <PageIntro kicker="Fit" title="Size guide">
        Measure over bare skin or light underwear. Keep the tape snug, not tight.
      </PageIntro>

      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              {['Size', 'Bust (cm)', 'Waist (cm)', 'Hip (cm)'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RULES.map((r) => (
              <tr key={r.size}>
                <td>{r.size}</td>
                <td>{r.bustMin}–{r.bustMax}</td>
                <td>{r.waistMin}–{r.waistMax}</td>
                <td>{r.hipMin}–{r.hipMax}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className={styles.finder}>
        <h2 className="display h3">Find my size</h2>
        <p className="muted">Enter measurements in centimetres for a starting recommendation.</p>
        <div className={styles.fields}>
          <label className="field">Bust<input value={bust} onChange={(e) => setBust(e.target.value)} inputMode="decimal" /></label>
          <label className="field">Waist<input value={waist} onChange={(e) => setWaist(e.target.value)} inputMode="decimal" /></label>
          <label className="field">Hip<input value={hip} onChange={(e) => setHip(e.target.value)} inputMode="decimal" /></label>
        </div>
        {suggestion && (
          <p className={styles.result}>
            Suggested size: <strong>{suggestion}</strong>
          </p>
        )}
        <a
          className="btn btn--whatsapp"
          href="https://wa.me/2348087504905?text=Hello%20MBP%20Lingerie%2C%20I%20need%20help%20finding%20my%20size."
          target="_blank"
          rel="noreferrer"
        >
          Confirm on WhatsApp
        </a>
      </section>
    </div>
  );
}
