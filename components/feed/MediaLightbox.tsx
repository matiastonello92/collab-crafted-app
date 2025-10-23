'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getStorageUrl } from '@/utils/storage';

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

interface MediaLightboxProps {
  media: MediaItem[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function MediaLightbox({
  media,
  initialIndex,
  open,
  onOpenChange,
  currentIndex,
  onIndexChange,
}: MediaLightboxProps) {
  const current = media[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < media.length - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onIndexChange(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onIndexChange(currentIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onOpenChange(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex]);

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 bg-black/95 border-0">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/10"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Counter */}
        {media.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium">
            {currentIndex + 1} / {media.length}
          </div>
        )}

        {/* Navigation buttons */}
        {media.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/10 disabled:opacity-30"
              onClick={handlePrev}
              disabled={!canGoPrev}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/10 disabled:opacity-30"
              onClick={handleNext}
              disabled={!canGoNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Media content */}
        <div className="relative w-full h-full flex items-center justify-center p-12">
          {current.type === 'image' ? (
            <div className="relative w-full h-full">
              <Image
                src={getStorageUrl(current.url)}
                alt={`Media ${currentIndex + 1}`}
                fill
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <video
              src={getStorageUrl(current.url)}
              poster={current.thumbnail ? getStorageUrl(current.thumbnail) : undefined}
              controls
              autoPlay
              className="max-w-full max-h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
