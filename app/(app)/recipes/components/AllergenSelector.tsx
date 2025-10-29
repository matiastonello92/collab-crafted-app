'use client';

import { useState, useEffect } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { COMMON_ALLERGENS, getAllergenLabel } from '../constants/allergens';
import { useTranslation } from '@/lib/i18n';

interface AllergenSelectorProps {
  selectedAllergens: string[];
  onAllergensChange: (allergens: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function AllergenSelector({
  selectedAllergens,
  onAllergensChange,
  label,
  placeholder
}: AllergenSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  
  const displayLabel = label || t('recipes.allergenSelector.label');
  const displayPlaceholder = placeholder || t('recipes.allergenSelector.placeholder');

  const handleToggle = (allergenKey: string) => {
    if (selectedAllergens.includes(allergenKey)) {
      onAllergensChange(selectedAllergens.filter(k => k !== allergenKey));
    } else {
      onAllergensChange([...selectedAllergens, allergenKey]);
    }
  };

  const handleRemove = (allergenKey: string) => {
    onAllergensChange(selectedAllergens.filter(k => k !== allergenKey));
  };

  const getAllergenInfo = (key: string) => {
    return COMMON_ALLERGENS.find(a => a.key === key);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{displayLabel}</label>
        {selectedAllergens.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t('recipes.allergenSelector.selected').replace('{count}', selectedAllergens.length.toString())}
          </span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start text-left font-normal"
          >
            <AlertTriangle className="mr-2 h-4 w-4 shrink-0" />
            {displayPlaceholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('recipes.allergenSelector.searchPlaceholder')} className="h-8" />
            <CommandList>
              <CommandEmpty>{t('recipes.allergenSelector.noAllergens')}</CommandEmpty>
              <CommandGroup className="p-2">
                <div className="grid grid-cols-2 gap-1">
                  {COMMON_ALLERGENS.map((allergen) => {
                    const isSelected = selectedAllergens.includes(allergen.key);
                    return (
                      <CommandItem
                        key={allergen.key}
                        onSelect={() => handleToggle(allergen.key)}
                        className="cursor-pointer py-1.5 px-2"
                      >
                        <div
                          className={`mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'opacity-50'
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5" />}
                        </div>
                        <span className="text-sm">{getAllergenLabel(allergen.key)}</span>
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected badges */}
      {selectedAllergens.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedAllergens.map((key) => {
            const info = getAllergenInfo(key);
            if (!info) return null;
            
            return (
              <Badge
                key={key}
                variant="secondary"
                className="gap-1 text-xs py-0.5 px-2"
                style={{
                  backgroundColor: `hsl(${info.color} / 0.15)`,
                  color: `hsl(${info.color})`,
                  borderColor: `hsl(${info.color} / 0.3)`
                }}
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                {getAllergenLabel(info.key)}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemove(key);
                  }}
                  className="ml-1 hover:bg-black/10 rounded-sm"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
