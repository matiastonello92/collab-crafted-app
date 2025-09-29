'use client';

import { useParams } from 'next/navigation';
import { CatalogPage } from '@/components/inventory/CatalogPage';

export default function CatalogRoute() {
  const params = useParams();
  const category = params.category as 'kitchen' | 'bar' | 'cleaning';

  return <CatalogPage category={category} />;
}
