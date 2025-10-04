'use client';

import { Search, CheckCircle2, XCircle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ItemSelector } from './ItemSelector';
import { AllergenSelector } from './AllergenSelector';
import { COMMON_ALLERGENS } from '../constants/allergens';
import { AlertTriangle } from 'lucide-react';

export interface RecipeFiltersState {
  q: string;
  status: string;
  category: string;
  includeItems: string[];
  excludeItems: string[];
  allergens?: string[];
}

interface RecipeFiltersProps {
  filters: RecipeFiltersState;
  onFiltersChange: (filters: RecipeFiltersState) => void;
  locationId: string;
  itemNames: Map<string, string>; // Map<itemId, itemName>
}

const STATUSES = [
  { value: 'all', label: 'Tutti gli stati' },
  { value: 'draft', label: 'Bozza' },
  { value: 'submitted', label: 'In Revisione' },
  { value: 'published', label: 'Pubblicata' },
  { value: 'archived', label: 'Archiviata' },
];

const CATEGORIES = [
  { value: 'all', label: 'Tutte le categorie' },
  { value: 'main_course', label: 'Primi' },
  { value: 'appetizer', label: 'Antipasti' },
  { value: 'side_dish', label: 'Contorni' },
  { value: 'dessert', label: 'Dolci' },
  { value: 'beverage', label: 'Bevande' },
  { value: 'sauce', label: 'Salse' },
  { value: 'other', label: 'Altro' },
];

export function RecipeFilters({
  filters,
  onFiltersChange,
  locationId,
  itemNames,
}: RecipeFiltersProps) {
  const updateFilter = (key: keyof RecipeFiltersState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof RecipeFiltersState) => {
    if (key === 'includeItems' || key === 'excludeItems') {
      updateFilter(key, []);
    } else {
      updateFilter(key, key === 'status' || key === 'category' ? 'all' : '');
    }
  };

  const clearAllFilters = () => {
    onFiltersChange({
      q: '',
      status: 'all',
      category: 'all',
      includeItems: [],
      excludeItems: [],
      allergens: [],
    });
  };

  const hasActiveFilters =
    filters.q ||
    (filters.status && filters.status !== 'all') ||
    (filters.category && filters.category !== 'all') ||
    filters.includeItems.length > 0 ||
    filters.excludeItems.length > 0 ||
    (filters.allergens && filters.allergens.length > 0);

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca ricette..."
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => updateFilter('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category */}
        <Select
          value={filters.category || 'all'}
          onValueChange={(value) => updateFilter('category', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearAllFilters}
            className="w-full"
          >
            Reset Filtri
          </Button>
        )}
      </div>

      {/* Item Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ItemSelector
          locationId={locationId}
          selectedItems={filters.includeItems}
          onItemsChange={(items) => updateFilter('includeItems', items)}
          label="Includi Ingredienti"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <ItemSelector
          locationId={locationId}
          selectedItems={filters.excludeItems}
          onItemsChange={(items) => updateFilter('excludeItems', items)}
          label="Escludi Ingredienti"
          icon={<XCircle className="h-4 w-4" />}
        />
      </div>

      {/* Allergens Filter */}
      <div className="space-y-2">
        <AllergenSelector
          selectedAllergens={filters.allergens || []}
          onAllergensChange={(allergens) =>
            updateFilter('allergens', allergens.length > 0 ? allergens : undefined)
          }
          label="Senza Allergeni"
          placeholder="Escludi allergeni..."
        />
        <p className="text-xs text-muted-foreground">
          Mostra solo ricette senza questi allergeni
        </p>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {filters.q && (
            <Badge variant="secondary" className="gap-1">
              Ricerca: {filters.q}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter('q')}
              />
            </Badge>
          )}
          {filters.status && filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Stato: {STATUSES.find((s) => s.value === filters.status)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter('status')}
              />
            </Badge>
          )}
          {filters.category && filters.category !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Categoria:{' '}
              {CATEGORIES.find((c) => c.value === filters.category)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter('category')}
              />
            </Badge>
          )}
          {filters.includeItems.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Includi: {filters.includeItems.map((id) => itemNames.get(id) || id).join(', ')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter('includeItems')}
              />
            </Badge>
          )}
          {filters.excludeItems.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Escludi: {filters.excludeItems.map((id) => itemNames.get(id) || id).join(', ')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter('excludeItems')}
              />
            </Badge>
          )}

          {/* Allergen badges */}
          {filters.allergens && filters.allergens.length > 0 && filters.allergens.map((allergenKey) => {
            const allergen = COMMON_ALLERGENS.find(a => a.key === allergenKey);
            return allergen ? (
              <Badge
                key={allergenKey}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-secondary/80"
                onClick={() => {
                  const newAllergens = filters.allergens?.filter(k => k !== allergenKey);
                  updateFilter('allergens', newAllergens && newAllergens.length > 0 ? newAllergens : undefined);
                }}
                style={{
                  backgroundColor: `hsl(${allergen.color} / 0.15)`,
                  color: `hsl(${allergen.color})`,
                  borderColor: `hsl(${allergen.color} / 0.3)`
                }}
              >
                <AlertTriangle className="h-3 w-3" />
                Senza {allergen.label}
                <X className="h-3 w-3" />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
