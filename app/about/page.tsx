export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <div className="container" style={{ padding: '3.5rem 0 6rem', maxWidth: 720 }}>
      <p style={{ letterSpacing: '0.22em', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 500 }}>The house</p>
      <h1 className="display h2" style={{ margin: '0.35rem 0 0.8rem' }}>Soft luxury,<br />made with intention.</h1>
      <p className="muted" style={{ fontSize: '1.15rem', fontWeight: 300, maxWidth: '36ch' }}>
        Luxury. Confidence. You.
      </p>
      <div style={{ display: 'grid', gap: '1.25rem', marginTop: '2.2rem', color: 'var(--muted)', fontWeight: 300, fontSize: '1.05rem' }}>
        <p>
          MBP Lingerie is a Nigerian house of intimacywear — pieces designed to feel expensive on skin,
          photograph beautifully, and arrive with discreet care.
        </p>
        <p>
          We believe true luxury is quiet. Fit guidance is available on WhatsApp whenever you need it.
          Every drop is chosen for women who wear their power without spectacle.
        </p>
        <p>
          From everyday essentials to evening statements, MBP is made for the moment you decide how you want to feel.
        </p>
      </div>
    </div>
  );
}
