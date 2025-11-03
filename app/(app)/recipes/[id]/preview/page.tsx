import { Suspense } from 'react';
import PreviewRecipeMode from './PreviewRecipeMode';
import { Skeleton } from '@/components/ui/skeleton';

export default async function PreviewRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <PreviewRecipeMode recipeId={id} />
    </Suspense>
  );
}
