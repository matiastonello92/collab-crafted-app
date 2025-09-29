'use client';

import { InventoryPage } from '@/components/inventory/InventoryPage';
import { use } from 'react';

export default function KitchenInventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <InventoryPage category="kitchen" inventoryId={id} />;
}
