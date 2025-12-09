'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight, isNative } from '@/lib/capacitor/native';
import { useBottomBarConfig } from './useBottomBarConfig';
import { BottomBarItem } from './BottomBarItem';

const STORAGE_KEY = 'klyra_bottom_bar_visible';

export function SmartBottomBar() {
  const [isVisible, setIsVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const { items, smartId, trackClick, currentPath } = useBottomBarConfig();
  const navRef = useRef<HTMLDivElement>(null);

  // Load visibility preference
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsVisible(stored === 'true');
    }
    setIsReady(true);
  }, []);

  // Save visibility preference
  useEffect(() => {
    if (isReady) {
      localStorage.setItem(STORAGE_KEY, String(isVisible));
    }
  }, [isVisible, isReady]);

  // Swipe gesture handler - bind to ref
  useDrag(
    ({ movement: [, my], velocity: [, vy], direction: [, yDir], active }) => {
      if (active) return;
      
      // Swipe down to hide (yDir > 0, my > 0)
      if (yDir > 0 && (my > 30 || vy > 0.3)) {
        if (isNative()) hapticLight();
        setIsVisible(false);
      }
      // Swipe up to show (yDir < 0, my < 0)
      else if (yDir < 0 && (my < -30 || vy > 0.3)) {
        if (isNative()) hapticLight();
        setIsVisible(true);
      }
    },
    { target: navRef, axis: 'y', filterTaps: true }
  );

  const handleItemClick = (linkId: string) => {
    trackClick(linkId);
  };

  const handleShowBar = () => {
    if (isNative()) hapticLight();
    setIsVisible(true);
  };

  // Don't render on desktop
  if (!isReady) return null;

  return (
    <>
      {/* Hidden state - pill indicator */}
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={handleShowBar}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 lg:hidden bg-card border border-border rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronUp className="h-4 w-4" />
            <span className="text-xs font-medium">Menu</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Visible state - full bottom bar */}
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 lg:hidden',
              'bg-card/95 backdrop-blur-md border-t border-border',
              'pb-safe touch-pan-x'
            )}
          >
            {/* Drag handle area */}
            <div ref={navRef} className="touch-pan-y">
              {/* Drag handle indicator */}
              <div className="flex justify-center pt-1.5 pb-0.5">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Navigation items */}
              <div className="flex items-center justify-around px-2">
                {items.map((link) => (
                  <BottomBarItem
                    key={link.id}
                    link={link}
                    isActive={currentPath === link.href || currentPath?.startsWith(link.href + '/')}
                    isSmart={link.id === smartId}
                    onClick={() => handleItemClick(link.id)}
                  />
                ))}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
