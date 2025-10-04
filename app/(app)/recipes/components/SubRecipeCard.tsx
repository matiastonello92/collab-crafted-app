'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChefHat, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { calculateSubRecipeScale } from '@/lib/recipes/scaling';
import { useTranslation } from '@/lib/i18n';

interface SubRecipeCardProps {
  subRecipe: {
    id: string;
    title: string;
    servings: number;
    photo_url?: string;
  };
  requestedServings: number;
}

export function SubRecipeCard({ subRecipe, requestedServings }: SubRecipeCardProps) {
  const { t } = useTranslation();
  const scaleFactor = calculateSubRecipeScale(requestedServings, subRecipe.servings);

  return (
    <Card className="bg-accent/50 border-accent">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 rounded-md">
            <AvatarImage src={subRecipe.photo_url} alt={subRecipe.title} />
            <AvatarFallback className="rounded-md">
              <ChefHat className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{subRecipe.title}</h4>
              <Badge variant="outline" className="text-xs shrink-0">
                Sub-ricetta
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Prepara {requestedServings} porzioni
              {scaleFactor !== 1 && (
                <span className="ml-1">
                  (ricetta base: {subRecipe.servings} porz., fattore: {scaleFactor.toFixed(2)}x)
                </span>
              )}
            </p>
            
            <Link href={`/recipes/${subRecipe.id}`} passHref>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 h-7 text-xs gap-1 px-2"
              >
                <ExternalLink className="h-3 w-3" />
                {t('recipe.viewFullRecipe')}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
