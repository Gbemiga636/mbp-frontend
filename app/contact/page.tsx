import { ContactForm } from '@/components/contact/ContactForm';
import { PageIntro } from '@/components/layout/PageIntro';
import styles from './contact.module.css';

export const metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <div className={`container ${styles.page}`}>
      <PageIntro kicker="Concierge" title="How may we help?">
        Fit, orders, and discreet delivery — a note away.
      </PageIntro>

      <div className={styles.grid}>
        <div className={styles.channels}>
          <a className="btn btn--whatsapp" href="https://wa.me/2348087504905?text=Hello%20MBP%20Lingerie%2C%20I%20need%20assistance." target="_blank" rel="noreferrer">
            WhatsApp 08087504905
          </a>
          <a className="btn btn--ghost" href="tel:+2348087504905">
            Call MBP
          </a>
          <a className="btn btn--ghost" href="mailto:mbplingerie@gmail.com">
            mbplingerie@gmail.com
          </a>
          <p className="muted">Lagos, Nigeria · discreet delivery nationwide</p>
        </div>

        <div className={styles.form}>
          <p className="muted">Prefer a written note? We reply within one business day.</p>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
