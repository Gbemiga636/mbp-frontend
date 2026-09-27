'use client';

import Image, { type ImageProps } from 'next/image';
import { shouldProxyImage } from '@/lib/media';

type Props = Omit<ImageProps, 'src'> & { src: string };

export function StoreImage({ src, alt, quality = 70, ...props }: Props) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={alt}
      quality={quality}
      unoptimized={!shouldProxyImage(src)}
      {...props}
    />
  );
}
