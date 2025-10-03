import { Suspense } from 'react';
import CookModeClient from './CookModeClient';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function CookModePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <CookModeClient recipeId={params.id} />
    </Suspense>
  );
}
