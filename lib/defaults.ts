import type { HomeReview, Product } from './types';

export const DEFAULT_REVIEWS: HomeReview[] = [
  {
    id: 'ada',
    text: 'The fit is unreal. It feels expensive, looks luxurious, and the finishing is so neat. I’m obsessed.',
    meta: 'Ada — Lagos',
  },
  {
    id: 'zainab',
    text: 'I didn’t expect the fabric to feel this soft. The packaging alone screamed class. Worth every naira.',
    meta: 'Zainab — Abuja (FCT)',
  },
  {
    id: 'amarachi',
    text: 'I wore it once and my confidence level went up instantly. The design is bold but still elegant.',
    meta: 'Amarachi — Rivers',
  },
  {
    id: 'damilola',
    text: 'Everything about it is premium—stitching, straps, fit. It sits perfectly and photographs beautifully.',
    meta: 'Damilola — Oyo',
  },
  {
    id: 'ngozi',
    text: 'Fast delivery, excellent quality, and it looks exactly like the pictures. I’m coming back for more.',
    meta: 'Ngozi — Enugu',
  },
];

export function imageByCategory(products: Product[], slug: string, fallback: string) {
  const hit = products.find((p) => (p.category || '').toLowerCase() === slug && p.image);
  return hit?.image || fallback;
}

export function catalogImages(products: Product[], fallbacks: string[], count = 8) {
  const fromCatalog = products.map((p) => p.image).filter(Boolean) as string[];
  return [...new Set([...fromCatalog, ...fallbacks])].slice(0, count);
}
