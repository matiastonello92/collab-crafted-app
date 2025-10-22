'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

interface MediaPreviewProps {
  media: MediaItem[];
  onRemove?: (index: number) => void;
}

export function MediaPreview({ media, onRemove }: MediaPreviewProps) {
  if (!media || media.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
      {media.map((item, index) => (
        <div
          key={index}
          className="relative aspect-square rounded-lg overflow-hidden bg-accent/10 group"
        >
          {item.type === 'image' ? (
            <Image
              src={item.url}
              alt={`Preview ${index + 1}`}
              fill
              className="object-cover"
            />
          ) : (
            <video
              src={item.url}
              poster={item.thumbnail}
              className="w-full h-full object-cover"
            />
          )}

          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
