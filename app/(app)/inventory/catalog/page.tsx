'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHat, Wine, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

const categories = [
  {
    id: 'kitchen',
    name: 'kitchen',
    icon: ChefHat,
    href: '/inventory/catalog/kitchen',
    color: 'bg-orange-500/10 text-orange-600 border-orange-200'
  },
  {
    id: 'bar',
    name: 'bar',
    icon: Wine,
    href: '/inventory/catalog/bar',
    color: 'bg-purple-500/10 text-purple-600 border-purple-200'
  },
  {
    id: 'cleaning',
    name: 'cleaning',
    icon: Sparkles,
    href: '/inventory/catalog/cleaning',
    color: 'bg-blue-500/10 text-blue-600 border-blue-200'
  }
];

export default function CatalogIndexPage() {
  const { t } = useTranslation()
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
          <h1 className="text-3xl font-bold">{t('inventory.catalog')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('catalog.description')}
          </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 border ${category.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle>{t(`catalog.categories.${category.id}.name`)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t(`catalog.categories.${category.id}.description`)}
                </p>
                <Link href={category.href}>
                  <Button className="w-full" variant="outline">
                    {t('catalog.openCatalog')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
