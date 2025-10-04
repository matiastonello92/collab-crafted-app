'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import SidebarClient from '@/components/nav/SidebarClient';
import { useTranslation } from '@/lib/i18n';

export function MobileSidebar() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false);

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
        <SidebarClient onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
