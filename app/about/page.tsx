import Image from 'next/image';
import Link from 'next/link';
import { PageIntro } from '@/components/layout/PageIntro';
import { fetchStore } from '@/lib/api';
import styles from './about.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'About' };

export default async function AboutPage() {
  const products = await fetchStore().catch(() => []);
  const portrait = products.find((p) => p.image)?.image || '/assets/lingerie2.jpeg';

  return (
    <div className={`container ${styles.page}`}>
      <PageIntro kicker="The house" title="Soft luxury, made with intention.">
        Luxury. Confidence. You.
      </PageIntro>

      <div className={styles.split}>
        <div className={styles.media}>
          <Image src={portrait} alt="MBP Lingerie" fill sizes="(max-width:900px) 100vw, 48vw" unoptimized />
        </div>
        <div className={styles.copy}>
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
          <div className={styles.actions}>
            <Link href="/shop" className="btn">
              Shop the collection
            </Link>
            <Link href="/size-guide" className="btn btn--ghost">
              Size guide
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
