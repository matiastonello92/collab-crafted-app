'use client';

import { useState, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SwipeableSheetContent, SheetTrigger } from '@/components/ui/sheet';
import SidebarClient from '@/components/nav/SidebarClient';
import { useTranslation } from '@/lib/i18n';
import { SwipeEdgeOpener } from './SwipeEdgeOpener';

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

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <>
      {/* Edge swipe detector - solo quando sidebar è chiusa */}
      {!open && <SwipeEdgeOpener onOpen={handleOpen} />}
      
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
        <SwipeableSheetContent 
          side="left" 
          className="w-[280px] p-0 border-l-0"
          onClose={() => setOpen(false)}
        >
          <SidebarClient 
            isMobile
            onNavigate={() => setOpen(false)}
            locations={locations}
            activeLocationId={activeLocationId}
            setActiveLocation={setActiveLocation}
          />
        </SwipeableSheetContent>
      </Sheet>
    </>
  );
}
