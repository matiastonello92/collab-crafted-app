import { Suspense } from 'react';
import CookModeClient from './CookModeClient';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default async function CookModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <CookModeClient recipeId={id} />
    </Suspense>
  );
}
