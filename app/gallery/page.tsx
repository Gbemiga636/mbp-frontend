import { fetchGallery } from '@/lib/api';
import { GalleryFeed } from '@/components/gallery/GalleryFeed';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gallery' };

export default async function GalleryPage() {
  const items = await fetchGallery().catch(() => []);
  return <GalleryFeed items={items} />;
}
