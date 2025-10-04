import { CatalogPage } from '@/components/inventory/CatalogPage';

export default function CatalogRoute({
  params,
}: {
  params: { category: string };
}) {
  const category = params.category as 'kitchen' | 'bar' | 'cleaning';
  return <CatalogPage category={category} />;
}
