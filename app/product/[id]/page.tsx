import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductClient } from '@/components/product/ProductClient';
import { fetchProduct, fetchStore } from '@/lib/api';
import { displayPrice, formatNaira } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id).catch(() => null);
  if (!product) return { title: 'Product' };
  const { price } = displayPrice(product);
  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.desc || `${product.name} — ${formatNaira(price)}`,
    openGraph: {
      title: product.name,
      description: product.desc || undefined,
      images: product.image ? [{ url: product.image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) notFound();
  const all = await fetchStore().catch(() => []);
  const related = all
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 8);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image ? [product.image] : [],
    description: product.desc,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      price: displayPrice(product).price,
      availability: product.soldOut
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductClient product={product} related={related} />
    </>
  );
}
