'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChefHat, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface RecipeSummaryCardProps {
  title: string;
  category: string;
  servings: number;
  photoUrl?: string;
  ingredientsCount: number;
  stepsCount: number;
}

export function RecipeSummaryCard({
  title,
  category,
  servings,
  photoUrl,
  ingredientsCount,
  stepsCount,
}: RecipeSummaryCardProps) {
  const { t } = useTranslation();
  
  const fields = [
    { label: 'Titolo', value: title, isComplete: !!title },
    { label: 'Categoria', value: category, isComplete: !!category },
    { label: 'Porzioni', value: servings, isComplete: servings > 0 },
    { label: 'Foto', value: photoUrl, isComplete: !!photoUrl },
    { label: 'Ingredienti', value: ingredientsCount, isComplete: ingredientsCount > 0 },
    { label: 'Step', value: stepsCount, isComplete: stepsCount > 0 },
  ];

  const completedFields = fields.filter((f) => f.isComplete).length;
  const totalFields = fields.length;
  const progress = (completedFields / totalFields) * 100;

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="text-lg">Anteprima Ricetta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Photo Preview */}
        <div className="aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {photoUrl ? (
            <Avatar className="w-full h-full rounded-lg">
              <AvatarImage src={photoUrl} alt={title} className="object-cover" />
              <AvatarFallback className="rounded-lg">
                <ChefHat className="w-12 h-12" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="w-12 h-12" />
              <span className="text-sm">{t('common.messages.noPhoto')}</span>
            </div>
          )}
        </div>

        {/* Title & Category */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg line-clamp-2">
            {title || 'Titolo ricetta'}
          </h3>
          {category && (
            <Badge variant="secondary" className="w-fit">
              {category}
            </Badge>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Completamento</span>
            <span className="text-muted-foreground">
              {completedFields}/{totalFields}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Fields Checklist */}
        <div className="space-y-2">
          {fields.map((field) => (
            <div
              key={field.label}
              className={cn(
                'flex items-center justify-between text-sm',
                field.isComplete ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <span className="flex items-center gap-2">
                {field.isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
                {field.label}
              </span>
              <span className="text-xs">
                {field.label === 'Ingredienti' && `${ingredientsCount}`}
                {field.label === 'Step' && `${stepsCount}`}
                {field.label === 'Porzioni' && servings > 0 && `${servings}`}
                {(field.label === 'Titolo' || field.label === 'Categoria' || field.label === 'Foto') &&
                  (field.isComplete ? '✓' : '—')}
              </span>
            </div>
          ))}
        </div>

        {/* Missing Fields Alert */}
        {completedFields < totalFields && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Campi mancanti:</strong> completa tutti i campi per inviare la ricetta
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
