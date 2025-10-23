'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getStorageUrl } from '@/utils/storage';
import { MediaLightbox } from './MediaLightbox';

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

interface MediaGalleryProps {
  media: MediaItem[];
}

export function MediaGallery({ media }: MediaGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!media || media.length === 0) return null;

  const handleMediaClick = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const gridClass = cn(
    'grid gap-2 mt-3 rounded-lg overflow-hidden',
    media.length === 1 && 'grid-cols-1',
    media.length === 2 && 'grid-cols-2',
    media.length === 3 && 'grid-cols-2',
    media.length >= 4 && 'grid-cols-2'
  );

  return (
    <>
      <div className={gridClass}>
        {media.slice(0, 4).map((item, index) => (
          <div
            key={index}
            className={cn(
              'relative overflow-hidden bg-accent/10 cursor-pointer',
              media.length === 3 && index === 0 && 'col-span-2',
              media.length === 1 ? 'aspect-video' : 'aspect-square'
            )}
            onClick={() => handleMediaClick(index)}
          >
          {item.type === 'image' ? (
            <Image
              src={getStorageUrl(item.url)}
              alt={`Media ${index + 1}`}
              fill
              className="object-cover cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
            />
          ) : (
            <video
              src={getStorageUrl(item.url)}
              poster={item.thumbnail ? getStorageUrl(item.thumbnail) : undefined}
              controls
              className="w-full h-full object-cover"
              preload="metadata"
            />
          )}
          
          {/* Show count overlay if more than 4 items */}
          {index === 3 && media.length > 4 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">+{media.length - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>

    <MediaLightbox
      media={media}
      initialIndex={selectedIndex}
      open={lightboxOpen}
      onOpenChange={setLightboxOpen}
      currentIndex={selectedIndex}
      onIndexChange={setSelectedIndex}
    />
    </>
  );
}
