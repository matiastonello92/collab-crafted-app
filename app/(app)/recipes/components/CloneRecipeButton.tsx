'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface CloneRecipeButtonProps {
  recipeId: string;
  recipeTitle: string;
  disabled?: boolean;
}

export function CloneRecipeButton({ recipeId, recipeTitle, disabled }: CloneRecipeButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleClone = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/clone`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to clone recipe');

      const data = await response.json();

      toast.success(t('toast.recipe.cloned'), {
        description: `"${recipeTitle}" ${t('toast.recipe.cloned')}`
      });

      // Redirect to the new cloned recipe
      router.push(`/recipes/${data.recipe.id}`);
    } catch (error) {
      console.error('Error cloning recipe:', error);
      toast.error(t('toast.recipe.errorCloning'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleClone}
      disabled={loading || disabled}
      className="gap-2"
    >
      <Copy className="w-4 h-4" />
      {loading ? 'Clonazione...' : 'Clona Ricetta'}
    </Button>
  );
}
