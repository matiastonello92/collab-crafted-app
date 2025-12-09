'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { hapticLight, isNative } from '@/lib/capacitor/native';
import { BottomBarLink } from './bottomBarRegistry';
import { Sparkles } from 'lucide-react';

interface BottomBarItemProps {
  link: BottomBarLink;
  isActive: boolean;
  isSmart?: boolean;
  onClick?: () => void;
}

export function BottomBarItem({ link, isActive, isSmart, onClick }: BottomBarItemProps) {
  const { t } = useTranslation();
  const Icon = link.icon;

  const handleClick = () => {
    if (isNative()) hapticLight();
    onClick?.();
  };

  return (
    <Link
      href={link.href}
      onClick={handleClick}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[64px] transition-colors relative',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div className="relative">
        <Icon className="h-5 w-5" />
        {isSmart && !isActive && (
          <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-500" />
        )}
      </div>
      <span className="text-[10px] font-medium truncate max-w-[56px]">
        {t(link.labelKey)}
      </span>
      {isActive && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
      )}
    </Link>
  );
}
