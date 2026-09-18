export const metadata = { title: 'Terms & Conditions' };

export default function TermsPage() {
  return (
    <div className="container" style={{ padding: '2rem 0 4rem', maxWidth: 760 }}>
      <h1 className="display h2">Terms & Conditions</h1>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem', color: 'var(--muted)' }}>
        <p>By shopping with MBP Lingerie you agree to these terms covering orders, delivery within Nigeria, and product care.</p>
        <p>Prices are listed in Nigerian Naira. Payment is processed securely via Paystack or arranged through WhatsApp concierge.</p>
        <p>Due to the intimate nature of our products, returns are limited for hygiene reasons unless an item arrives damaged or incorrect. Contact us within 48 hours of delivery with photos.</p>
        <p>All imagery, branding, and product designs remain the property of MBP Lingerie.</p>
      </div>
    </div>
  );
}
