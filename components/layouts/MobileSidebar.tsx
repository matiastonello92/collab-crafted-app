'use client';

import { useState, useRef } from 'react';
import { Menu } from 'lucide-react';
import { useDrag } from '@use-gesture/react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import SidebarClient from '@/components/nav/SidebarClient';
import { useTranslation } from '@/lib/i18n';

export function MobileSidebar({
  locations,
  activeLocationId,
  setActiveLocation,
}: {
  locations: { id: string; name: string; org_id: string }[];
  activeLocationId: string | null;
  setActiveLocation: (id?: string | null) => Promise<void>;
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const bind = useDrag(({ movement: [mx], velocity: [vx], direction: [xDir], cancel, active }) => {
    // Only handle left swipe (negative movement)
    if (mx > 20) {
      cancel();
      return;
    }
    
    if (active && mx < 0) {
      // Apply transform during drag
      if (contentRef.current) {
        const clampedX = Math.max(mx, -280);
        contentRef.current.style.transform = `translateX(${clampedX}px)`;
        contentRef.current.style.opacity = `${1 - Math.abs(clampedX) / 280}`;
      }
    } else {
      // On release, check if should close
      const threshold = -80;
      const velocityThreshold = 0.5;
      
      if (mx < threshold || (xDir < 0 && vx > velocityThreshold)) {
        setOpen(false);
      }
      
      // Reset styles
      if (contentRef.current) {
        contentRef.current.style.transform = '';
        contentRef.current.style.opacity = '';
      }
    }
  }, { axis: 'x', filterTaps: true });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 lg:hidden"
          aria-label={t('aria.openMenu')}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <div {...bind()} ref={contentRef} className="h-full touch-pan-y">
          <SidebarClient 
            isMobile
            onNavigate={() => setOpen(false)}
            locations={locations}
            activeLocationId={activeLocationId}
            setActiveLocation={setActiveLocation}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}