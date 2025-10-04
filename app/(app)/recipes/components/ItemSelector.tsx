'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
}

interface ItemSelectorProps {
  locationId: string;
  selectedItems: string[];
  onItemsChange: (items: string[]) => void;
  label: string;
  icon?: React.ReactNode;
}

export function ItemSelector({
  locationId,
  selectedItems,
  onItemsChange,
  label,
  icon,
}: ItemSelectorProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    
    const loadItems = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/v1/inventory/catalog?locationId=${locationId}`
        );
        if (response.ok) {
          const data = await response.json();
          setItems(data.items || []);
        }
      } catch (error) {
        console.error('Failed to load catalog items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [locationId]);

  const toggleItem = (itemId: string) => {
    const newSelected = selectedItems.includes(itemId)
      ? selectedItems.filter((id) => id !== itemId)
      : [...selectedItems, itemId];
    onItemsChange(newSelected);
  };

  const selectedItemNames = items
    .filter((item) => selectedItems.includes(item.id))
    .map((item) => item.name);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            {icon}
            <span className="truncate">
              {selectedItems.length > 0
                ? `${selectedItems.length} selezionati`
                : label}
            </span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cerca ingrediente..." />
          <CommandEmpty>
            {loading ? 'Caricamento...' : 'Nessun ingrediente trovato'}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {items.map((item) => (
              <CommandItem
                key={item.id}
                value={item.name}
                onSelect={() => toggleItem(item.id)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedItems.includes(item.id)
                      ? 'opacity-100'
                      : 'opacity-0'
                  )}
                />
                <span className="flex-1">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.category}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
