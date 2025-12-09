'use client';

import { useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { hapticLight, isNative } from '@/lib/capacitor/native';

interface SwipeEdgeOpenerProps {
  onOpen: () => void;
  edgeWidth?: number;
  threshold?: number;
}

export function SwipeEdgeOpener({ 
  onOpen, 
  edgeWidth = 24, 
  threshold = 50 
}: SwipeEdgeOpenerProps) {
  const hasTriggered = useRef(false);

  const bind = useDrag(
    ({ movement: [mx], velocity: [vx], direction: [xDir], active, first }) => {
      if (first) {
        hasTriggered.current = false;
      }

      // Solo swipe verso destra (xDir > 0)
      if (xDir <= 0) return;

      if (!active && !hasTriggered.current) {
        // Gesto terminato - controlla se supera la soglia
        if (mx > threshold || vx > 0.5) {
          hasTriggered.current = true;
          if (isNative()) hapticLight();
          onOpen();
        }
      }
    },
    { 
      axis: 'x',
      filterTaps: true,
      from: [0, 0],
    }
  );

  return (
    <div
      {...bind()}
      className="fixed left-0 top-0 h-full z-30 lg:hidden touch-pan-y"
      style={{ width: edgeWidth }}
      aria-hidden="true"
    />
  );
}
