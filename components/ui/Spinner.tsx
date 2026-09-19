import styles from './Spinner.module.css';

export function Spinner({ label = 'Loading', light = false }: { label?: string; light?: boolean }) {
  return (
    <div className={`${styles.wrap} ${light ? styles.light : ''}`} role="status" aria-live="polite" aria-label={label}>
      <span className={styles.ring} aria-hidden />
      <span className={styles.text}>{label}</span>
    </div>
  );
}
