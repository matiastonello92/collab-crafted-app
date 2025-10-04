'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RecipeEditorForm } from '../components/RecipeEditorForm';

export default function RecipeEditorPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/recipes')}
          aria-label="Torna alle ricette"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nuova Ricetta</h1>
          <p className="text-sm text-muted-foreground">
            Crea una nuova ricetta compilando i campi richiesti
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <RecipeEditorForm
            mode="create"
            onSuccess={(recipeId) => {
              router.push(`/recipes/${recipeId}/edit?tab=steps`);
            }}
            onCancel={() => router.push('/recipes')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
