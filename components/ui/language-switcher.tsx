'use client';

import { Globe } from 'lucide-react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { useTranslation } from '@/lib/i18n';

const AVAILABLE_LOCALES = [
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'en', label: '🇬🇧 English' },
] as const;

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          aria-label={t('aria.toggleLanguage')}
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px] bg-card/95 backdrop-blur-sm">
        {AVAILABLE_LOCALES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code as 'it' | 'en')}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{lang.label}</span>
            {locale === lang.code && <span className="ml-2 text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
