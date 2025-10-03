import { Suspense } from 'react';
import RecipeDetailClient from './RecipeDetailClient';
import { Skeleton } from '@/components/ui/skeleton';

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <RecipeDetailClient recipeId={params.id} />
    </Suspense>
  );
}
