'use client';

import Image, { type ImageProps } from 'next/image';
import { resolveMediaUrl, shouldProxyImage } from '@/lib/media';

type Props = Omit<ImageProps, 'src'> & { src: string };

export function StoreImage({ src, alt, quality = 70, ...props }: Props) {
  const url = resolveMediaUrl(src);
  if (!url) return null;
  return (
    <Image
      src={url}
      alt={alt}
      quality={quality}
      unoptimized={!shouldProxyImage(url)}
      {...props}
    />
  );
}
