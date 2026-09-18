import type { Metadata } from 'next';
import { Bodoni_Moda, Outfit } from 'next/font/google';
import { StoreProvider } from '@/components/providers/StoreProvider';
import { SiteChrome } from '@/components/layout/SiteChrome';
import { fetchStore } from '@/lib/api';
import './globals.css';

const display = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display-loaded',
});

const body = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body-loaded',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_SITE_URL || 'https://mbplingerie.com.ng'),
  title: {
    default: 'MBP Lingerie | Luxury. Confidence. You.',
    template: '%s | MBP Lingerie',
  },
  description: 'Premium Nigerian lingerie — soft luxury, discreet packaging, WhatsApp concierge and secure checkout.',
  icons: {
    icon: '/assets/Logo.PNG',
    apple: '/assets/Logo.PNG',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'MBP Lingerie',
    description: 'Luxury. Confidence. You.',
    images: [{ url: '/assets/Logo.PNG' }],
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#f7f3ee',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let products: Awaited<ReturnType<typeof fetchStore>> = [];
  try {
    products = await fetchStore();
  } catch {
    products = [];
  }

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <StoreProvider>
          <SiteChrome products={products}>{children}</SiteChrome>
        </StoreProvider>
      </body>
    </html>
  );
}
