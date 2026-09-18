import { ContactForm } from '@/components/contact/ContactForm';

export const metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <div className="container" style={{ padding: '3.2rem 0 5.5rem', maxWidth: 720 }}>
      <p style={{ letterSpacing: '0.22em', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 500 }}>Concierge</p>
      <h1 className="display h2" style={{ margin: '0.3rem 0 0.6rem' }}>How may we help?</h1>
      <p className="muted" style={{ fontWeight: 300 }}>Fit, orders, and discreet delivery — a note away.</p>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
        <a className="btn btn--whatsapp" href="https://wa.me/2348087504905?text=Hello%20MBP%20Lingerie%2C%20I%20need%20assistance." target="_blank" rel="noreferrer">
          WhatsApp 08087504905
        </a>
        <a className="btn btn--ghost" href="tel:+2348087504905">Call MBP</a>
        <a className="btn btn--ghost" href="mailto:mbplingerie@gmail.com">mbplingerie@gmail.com</a>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <p className="muted">Prefer a written note? We reply within one business day.</p>
        <ContactForm />
      </div>
    </div>
  );
}
