'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { MONTHS, getMonthLabel } from '../constants/seasons';
import { useTranslation } from '@/lib/i18n';

interface SeasonSelectorProps {
  selectedMonths: string[];
  onMonthsChange: (months: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function SeasonSelector({
  selectedMonths,
  onMonthsChange,
  label,
  placeholder
}: SeasonSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  
  const displayLabel = label || t('recipes.seasonSelector.label');
  const displayPlaceholder = placeholder || t('recipes.seasonSelector.placeholder');

  const toggleMonth = (monthKey: string) => {
    if (selectedMonths.includes(monthKey)) {
      onMonthsChange(selectedMonths.filter(k => k !== monthKey));
    } else {
      onMonthsChange([...selectedMonths, monthKey]);
    }
  };

  const removeMonth = (monthKey: string) => {
    onMonthsChange(selectedMonths.filter(k => k !== monthKey));
  };

  return (
    <div className="space-y-2">
      <Label>{displayLabel}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <Calendar className="mr-2 h-4 w-4" />
            {selectedMonths.length > 0
              ? t('recipes.seasonSelector.selectedCount').replace('{count}', selectedMonths.length.toString())
              : displayPlaceholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('recipes.seasonSelector.searchPlaceholder')} />
            <CommandList>
              <CommandEmpty>{t('recipes.seasonSelector.noMonths')}</CommandEmpty>
              <CommandGroup>
                {MONTHS.map((month) => {
                  const isSelected = selectedMonths.includes(month.key);
                  return (
                    <CommandItem
                      key={month.key}
                      onSelect={() => toggleMonth(month.key)}
                      className="cursor-pointer"
                    >
                      <div
                        className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary"
                        style={{
                          backgroundColor: isSelected ? `hsl(${month.color})` : 'transparent',
                          borderColor: `hsl(${month.color})`
                        }}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span>{getMonthLabel(month.key)}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedMonths.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMonths.map((monthKey) => {
            const month = MONTHS.find(m => m.key === monthKey);
            if (!month) return null;
            return (
              <Badge
                key={monthKey}
                variant="secondary"
                className="gap-1 cursor-pointer"
                onClick={() => removeMonth(monthKey)}
                style={{
                  backgroundColor: `hsl(${month.color} / 0.15)`,
                  color: `hsl(${month.color})`,
                  borderColor: `hsl(${month.color} / 0.3)`
                }}
              >
                {getMonthLabel(month.key).slice(0, 3)}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
