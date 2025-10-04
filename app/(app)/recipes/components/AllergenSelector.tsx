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

interface AllergenSelectorProps {
  selectedAllergens: string[];
  onAllergensChange: (allergens: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function AllergenSelector({
  selectedAllergens,
  onAllergensChange,
  label = 'Allergeni',
  placeholder = 'Seleziona allergeni...'
}: AllergenSelectorProps) {
  const [open, setOpen] = useState(false);

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
        <label className="text-sm font-medium">{label}</label>
        {selectedAllergens.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {selectedAllergens.length} selezionati
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
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Cerca allergene..." />
            <CommandList>
              <CommandEmpty>Nessun allergene trovato.</CommandEmpty>
              <CommandGroup>
                {COMMON_ALLERGENS.map((allergen) => {
                  const isSelected = selectedAllergens.includes(allergen.key);
                  return (
                    <CommandItem
                      key={allergen.key}
                      onSelect={() => handleToggle(allergen.key)}
                      className="cursor-pointer"
                    >
                      <div
                        className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span>{getAllergenLabel(allergen.key)}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected badges */}
      {selectedAllergens.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedAllergens.map((key) => {
            const info = getAllergenInfo(key);
            if (!info) return null;
            
            return (
              <Badge
                key={key}
                variant="secondary"
                className="gap-1"
                style={{
                  backgroundColor: `hsl(${info.color} / 0.15)`,
                  color: `hsl(${info.color})`,
                  borderColor: `hsl(${info.color} / 0.3)`
                }}
              >
                <AlertTriangle className="h-3 w-3" />
                {getAllergenLabel(info.key)}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemove(key);
                  }}
                  className="ml-1 hover:bg-black/10 rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
