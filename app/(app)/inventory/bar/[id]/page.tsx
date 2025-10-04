import { InventoryPage } from '@/components/inventory/InventoryPage';

export default function BarInventoryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <InventoryPage category="bar" inventoryId={params.id} />;
}
