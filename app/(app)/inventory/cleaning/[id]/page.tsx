'use client';

import { InventoryPage } from '@/components/inventory/InventoryPage';

export default function CleaningInventoryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <InventoryPage category="cleaning" inventoryId={params.id} />;
}
