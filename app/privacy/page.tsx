export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="container" style={{ padding: '2rem 0 4rem', maxWidth: 760 }}>
      <h1 className="display h2">Privacy Policy</h1>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem', color: 'var(--muted)' }}>
        <p>We collect only what we need to fulfil orders: contact details, delivery address, and payment confirmation from Paystack.</p>
        <p>Cart and wishlist data may be stored locally in your browser. Analytics events are anonymised and do not include payment secrets.</p>
        <p>We do not sell personal data. WhatsApp conversations are handled by our team for order support.</p>
        <p>Contact mbplingerie@gmail.com for privacy requests.</p>
      </div>
    </div>
  );
}
