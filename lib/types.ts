export type ProductBadge = 'new' | 'bestseller' | 'limited' | 'sale' | 'almost-gone' | 'restocked';

export type Product = {
  id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image?: string;
  imageBack?: string;
  images?: string[];
  desc?: string;
  sizes?: string[];
  colors?: string[];
  category?: string;
  soldOut?: boolean;
  badges?: ProductBadge[];
  stock?: number | null;
  sku?: string;
  tags?: string[];
  materials?: string;
  care?: string;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  collectionIds?: string[];
};

export type HomeReview = {
  id: string;
  text: string;
  meta: string;
};

export type HomeContent = {
  heroVideo?: string;
  bandVideo?: string;
  preloadVideo?: string;
  featured?: Product[];
  reviews?: HomeReview[];
};

export type GalleryItem = {
  id: string;
  type?: 'image' | 'video';
  src: string;
  caption?: string;
};

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  size: string;
  color?: string;
  qty: number;
};

export type DeliveryZone = {
  id: string;
  label: string;
  fee: number;
};

export type SiteSettings = {
  deliveryFee?: number;
  whatsappNumber?: string;
  deliveryZones?: DeliveryZone[];
  storeName?: string;
  currency?: string;
};

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type Order = {
  reference: string;
  customer?: {
    email?: string;
    phone?: string;
    address?: string;
    name?: string;
  };
  notes?: string;
  totals?: {
    items?: unknown[];
    subtotal?: number;
    delivery?: number;
    total?: number;
  };
  paystack?: { id?: string; paidAt?: string };
  createdAt?: string;
  status?: OrderStatus;
  unread?: boolean;
};

export const CATEGORIES = [
  { slug: 'lingerie', name: 'Lingerie' },
  { slug: 'underwear', name: 'Underwear' },
  { slug: 'nightwear', name: 'Nightwear' },
  { slug: 'pyjamas', name: 'Pyjamas' },
] as const;

export const DEFAULT_WHATSAPP = '2348087504905';

export const DEFAULT_ZONES: DeliveryZone[] = [
  { id: 'lekki', label: 'Lekki', fee: 2000 },
  { id: 'vi-ikoyi', label: 'VI / Ikoyi', fee: 3000 },
  { id: 'ikota-ajah', label: 'Ikota / Ajah', fee: 3000 },
  { id: 'others', label: 'Other Lagos areas', fee: 5000 },
];
