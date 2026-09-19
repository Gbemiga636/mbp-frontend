import { PageIntro } from '@/components/layout/PageIntro';
import styles from '../legal.module.css';

export const metadata = { title: 'Terms & Conditions' };

export default function TermsPage() {
  return (
    <div className={`container ${styles.page}`}>
      <PageIntro kicker="Legal" title="Terms & Conditions" />
      <div className={styles.copy}>
        <p>By shopping with MBP Lingerie you agree to these terms covering orders, delivery within Nigeria, and product care.</p>
        <p>Prices are listed in Nigerian Naira. Payment is processed securely via Paystack or arranged through WhatsApp concierge.</p>
        <p>Due to the intimate nature of our products, returns are limited for hygiene reasons unless an item arrives damaged or incorrect. Contact us within 48 hours of delivery with photos.</p>
        <p>All imagery, branding, and product designs remain the property of MBP Lingerie.</p>
      </div>
    </div>
  );
}
