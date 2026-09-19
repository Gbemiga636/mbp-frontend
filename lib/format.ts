import { DEFAULT_WHATSAPP, type CartItem, type Product } from './types';

export function formatNaira(amount: number): string {
  return `₦${Number(amount || 0).toLocaleString('en-NG')}`;
}

export function displayPrice(p: Product): { price: number; original?: number; discountPct?: number } {
  const base = Number(p.price || 0);
  const sale = p.salePrice != null && Number(p.salePrice) > 0 && Number(p.salePrice) < base
    ? Number(p.salePrice)
    : null;
  if (sale == null) return { price: base };
  const discountPct = Math.round(((base - sale) / base) * 100);
  return { price: sale, original: base, discountPct };
}

export function productImages(p: Product): string[] {
  const list = [
    ...(Array.isArray(p.images) ? p.images : []),
    p.image,
    p.imageBack,
  ].filter((u): u is string => Boolean(u && String(u).trim()));
  return [...new Set(list)];
}

export function normalizeWhatsApp(num?: string): string {
  const raw = String(num || DEFAULT_WHATSAPP).replace(/\D/g, '');
  if (raw.startsWith('234')) return raw;
  if (raw.startsWith('0')) return `234${raw.slice(1)}`;
  return raw || DEFAULT_WHATSAPP;
}

export function whatsappUrl(message: string, number?: string): string {
  const phone = normalizeWhatsApp(number);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function productWhatsAppMessage(opts: {
  product: Product;
  size?: string;
  color?: string;
  quantity?: number;
  productUrl: string;
}): string {
  const { product, size, color, quantity = 1, productUrl } = opts;
  const { price } = displayPrice(product);
  return [
    'Hello MBP Lingerie',
    '',
    'I’d like to order:',
    `Product: ${product.name}`,
    `Size: ${size || 'Not selected'}`,
    `Colour: ${color || 'Not selected'}`,
    `Quantity: ${quantity}`,
    `Price: ${formatNaira(price)}`,
    `Product link: ${productUrl}`,
    '',
    'Please assist me with my order.',
  ].join('\n');
}

export function cartWhatsAppMessage(items: CartItem[], siteUrl: string): string {
  const lines = items.map(
    (it, i) =>
      `${i + 1}. ${it.name} — Size: ${it.size}${it.color ? `, Color: ${it.color}` : ''} — Qty: ${it.qty} — ${formatNaira(it.price * it.qty)}`
  );
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  return [
    'Hello MBP Lingerie',
    '',
    'Order enquiry',
    '',
    ...lines,
    '',
    `Total: ${formatNaira(total)}`,
    `Cart: ${siteUrl}/cart`,
    '',
    'Please assist me with my order.',
  ].join('\n');
}

export function categoryLabel(slug?: string): string {
  if (!slug) return 'All';
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}
