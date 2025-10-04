'use client';

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface RecipeBreadcrumbProps {
  recipeTitle?: string;
  mode: 'create' | 'edit';
}

export function RecipeBreadcrumb({ recipeTitle, mode }: RecipeBreadcrumbProps) {
  const { t } = useTranslation()
  
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className="flex items-center gap-1">
              <Home className="w-4 h-4" />
              {t('recipeBreadcrumb.home')}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/recipes">{t('recipeBreadcrumb.recipes')}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>
            {mode === 'create' ? t('recipeBreadcrumb.newRecipe') : recipeTitle || t('recipeBreadcrumb.editRecipe')}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
