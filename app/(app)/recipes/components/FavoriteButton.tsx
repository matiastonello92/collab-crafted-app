'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  recipeId: string;
  initialIsFavorite?: boolean;
  variant?: 'default' | 'icon';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function FavoriteButton({ 
  recipeId, 
  initialIsFavorite = false, 
  variant = 'icon',
  size = 'default',
  className 
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [loading, setLoading] = useState(false);

  const toggleFavorite = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/favorite`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to toggle favorite');

      const data = await response.json();
      setIsFavorite(data.is_favorite);

      toast.success(
        data.is_favorite ? 'Aggiunto ai preferiti' : 'Rimosso dai preferiti',
        { description: data.is_favorite 
          ? 'La ricetta è stata salvata nei tuoi preferiti'
          : 'La ricetta è stata rimossa dai preferiti'
        }
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Impossibile aggiornare i preferiti');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size={size === 'sm' ? 'icon' : 'default'}
        onClick={toggleFavorite}
        disabled={loading}
        className={cn('transition-colors', className)}
      >
        <Star 
          className={cn(
            'transition-all',
            size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
            isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
          )}
        />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={toggleFavorite}
      disabled={loading}
      className={cn('gap-2', className)}
    >
      <Star 
        className={cn(
          'transition-all',
          size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
          isFavorite ? 'fill-yellow-400 text-yellow-400' : ''
        )}
      />
      {isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
    </Button>
  );
}
