"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from '@/lib/i18n';

interface PrintRecipeButtonProps {
  recipeId: string;
  defaultServings?: number;
  defaultVariant?: 'full' | 'station';
}

const SERVING_OPTIONS = [2, 4, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];

export function PrintRecipeButton({ 
  recipeId, 
  defaultServings = 4,
  defaultVariant = 'full'
}: PrintRecipeButtonProps) {
  const { t } = useTranslation();
  const [servings, setServings] = useState(defaultServings.toString());
  const [isOpen, setIsOpen] = useState(false);

  const handlePrint = (variant: 'full' | 'station') => {
    try {
      const url = `/api/v1/recipes/${recipeId}/print?servings=${servings}&variant=${variant}`;
      window.open(url, '_blank');
      setIsOpen(false);
      toast.success(variant === 'full' ? t('recipes.print.fullSheetOpened') : t('recipes.print.stationSheetOpened'));
      
      // Log print usage
      fetch(`/api/v1/recipes/${recipeId}/log-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventType: 'recipe_printed',
          metadata: { variant, servings: parseInt(servings) }
        })
      }).catch(err => console.error('Failed to log usage:', err));
    } catch (error) {
      console.error('Print error:', error);
      toast.error(t('recipes.print.printError'));
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t('recipes.print.print')}>
          <Printer className="h-4 w-4 mr-2" />
          {t('recipes.print.print')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-3">{t('recipes.print.printRecipe')}</h4>
            
            <div className="space-y-2">
              <Label htmlFor="servings-select">{t('recipes.print.servings')}</Label>
              <Select value={servings} onValueChange={setServings}>
                <SelectTrigger id="servings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVING_OPTIONS.map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {t('recipes.print.servingsCount').replace('{count}', String(num))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handlePrint('full')}
              className="w-full justify-start"
              variant="default"
            >
              <Printer className="h-4 w-4 mr-2" />
              {t('recipes.print.fullSheet')}
              <span className="ml-auto text-xs opacity-70">
                {t('recipes.print.withPhotosAndNotes')}
              </span>
            </Button>
            
            <Button
              onClick={() => handlePrint('station')}
              className="w-full justify-start"
              variant="outline"
            >
              <Printer className="h-4 w-4 mr-2" />
              {t('recipes.print.stationSheet')}
              <span className="ml-auto text-xs opacity-70">
                {t('recipes.print.essentialOnly')}
              </span>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {t('recipes.print.openInNewWindow')}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
