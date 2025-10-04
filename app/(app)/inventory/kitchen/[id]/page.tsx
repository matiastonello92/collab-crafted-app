import { InventoryPage } from '@/components/inventory/InventoryPage';

export default function KitchenInventoryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <InventoryPage category="kitchen" inventoryId={params.id} />;
}
