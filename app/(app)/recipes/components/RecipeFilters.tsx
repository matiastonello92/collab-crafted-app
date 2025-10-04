'use client';

import { Search, CheckCircle2, XCircle, X, Star, ArrowUpDown } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ItemSelector } from './ItemSelector';
import { AllergenSelector } from './AllergenSelector';
import { SeasonSelector } from './SeasonSelector';
import { COMMON_ALLERGENS, getAllergenLabel } from '../constants/allergens';
import { MONTHS, getMonthLabel } from '../constants/seasons';
import { AlertTriangle, Calendar } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export interface RecipeFiltersState {
  q: string;
  status: string;
  category: string;
  includeItems: string[];
  excludeItems: string[];
  allergens?: string[];
  seasonMonths?: string[];
  inSeasonNow?: boolean;
  favorites: boolean;
  sortBy: string;
}

interface RecipeFiltersProps {
  filters: RecipeFiltersState;
  onFiltersChange: (filters: RecipeFiltersState) => void;
  locationId: string;
  itemNames: Map<string, string>; // Map<itemId, itemName>
}

export function RecipeFilters({
  filters,
  onFiltersChange,
  locationId,
  itemNames,
}: RecipeFiltersProps) {
  const { t } = useTranslation();

  const STATUSES = [
    { value: 'all', label: t('recipes.filters.allStatuses') },
    { value: 'draft', label: t('recipeStatus.draft') },
    { value: 'submitted', label: t('recipeStatus.submitted') },
    { value: 'published', label: t('recipeStatus.published') },
    { value: 'archived', label: t('recipeStatus.archived') },
  ];

  const CATEGORIES = [
    { value: 'all', label: t('recipes.filters.allCategories') },
    { value: 'main_course', label: t('categories.main_course') },
    { value: 'appetizer', label: t('categories.appetizer') },
    { value: 'side_dish', label: t('categories.side_dish') },
    { value: 'dessert', label: t('categories.dessert') },
    { value: 'beverage', label: t('categories.beverage') },
    { value: 'sauce', label: t('categories.sauce') },
    { value: 'other', label: t('categories.other') },
  ];
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
      seasonMonths: [],
      inSeasonNow: false,
      favorites: false,
      sortBy: 'recent',
    });
  };

  const hasActiveFilters =
    filters.q ||
    (filters.status && filters.status !== 'all') ||
    (filters.category && filters.category !== 'all') ||
    filters.includeItems.length > 0 ||
    filters.excludeItems.length > 0 ||
    (filters.allergens && filters.allergens.length > 0) ||
    (filters.seasonMonths && filters.seasonMonths.length > 0) ||
    filters.inSeasonNow ||
    filters.favorites;

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('recipes.filters.searchPlaceholder')}
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
            <SelectValue placeholder={t('recipes.filters.status')} />
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
            <SelectValue placeholder={t('recipes.filters.category')} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort By */}
        <Select
          value={filters.sortBy || 'recent'}
          onValueChange={(value) => updateFilter('sortBy', value)}
        >
          <SelectTrigger className="gap-2">
            <ArrowUpDown className="w-4 h-4" />
            <SelectValue placeholder={t('recipes.filters.recent')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t('recipes.filters.recent')}</SelectItem>
            <SelectItem value="favorites">{t('recipes.filters.favorites')}</SelectItem>
            <SelectItem value="most_used">{t('recipes.filters.mostUsed')}</SelectItem>
            <SelectItem value="name_asc">{t('recipes.filters.nameAsc')}</SelectItem>
            <SelectItem value="name_desc">{t('recipes.filters.nameDesc')}</SelectItem>
            <SelectItem value="most_cloned">{t('recipes.filters.mostCloned')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Favorites Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="favorites"
            checked={filters.favorites || false}
            onCheckedChange={(checked) => updateFilter('favorites', checked)}
          />
          <Label htmlFor="favorites" className="flex items-center gap-1 cursor-pointer">
            <Star className={filters.favorites ? 'w-4 h-4 fill-yellow-400 text-yellow-400' : 'w-4 h-4'} />
            {t('recipes.filters.onlyFavorites')}
          </Label>
        </div>
      </div>

      {/* Item Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ItemSelector
          locationId={locationId}
          selectedItems={filters.includeItems}
          onItemsChange={(items) => updateFilter('includeItems', items)}
          label={t('recipes.filters.includeIngredients')}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <ItemSelector
          locationId={locationId}
          selectedItems={filters.excludeItems}
          onItemsChange={(items) => updateFilter('excludeItems', items)}
          label={t('recipes.filters.excludeIngredients')}
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
          label={t('recipes.filters.withoutAllergens')}
          placeholder={t('recipes.allergenSelector.placeholder')}
        />
        <p className="text-xs text-muted-foreground">
          {t('recipes.filters.withoutAllergensDesc')}
        </p>
      </div>

      {/* Stagionalità */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <SeasonSelector
            selectedMonths={filters.seasonMonths || []}
            onMonthsChange={(months) => updateFilter('seasonMonths', months.length > 0 ? months : undefined)}
            label={t('recipes.filters.seasonMonths')}
            placeholder={t('recipes.filters.filterByMonth')}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            id="in-season-now"
            checked={filters.inSeasonNow || false}
            onCheckedChange={(checked) => updateFilter('inSeasonNow', checked)}
          />
          <Label htmlFor="in-season-now" className="flex items-center gap-1 cursor-pointer">
            <Calendar className="w-4 h-4" />
            {t('recipes.filters.inSeasonNow')}
          </Label>
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {filters.q && (
            <Badge variant="secondary" className="gap-1">
              {t('recipes.filters.search')}: {filters.q}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter('q')}
              />
            </Badge>
          )}
          {filters.status && filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {t('recipes.filters.status')}: {STATUSES.find((s) => s.value === filters.status)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter('status')}
              />
            </Badge>
          )}
          {filters.category && filters.category !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {t('recipes.filters.category')}:{' '}
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
              {t('recipes.filters.including')}: {filters.includeItems.map((id) => itemNames.get(id) || id).join(', ')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter('includeItems')}
              />
            </Badge>
          )}
          {filters.excludeItems.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              {t('recipes.filters.excluding')}: {filters.excludeItems.map((id) => itemNames.get(id) || id).join(', ')}
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
                {t('recipes.filters.without')} {getAllergenLabel(allergen.key)}
                <X className="h-3 w-3" />
              </Badge>
            ) : null;
          })}

          {/* Season badges */}
          {filters.seasonMonths && filters.seasonMonths.length > 0 && filters.seasonMonths.map((monthKey) => {
            const month = MONTHS.find(m => m.key === monthKey);
            return month ? (
              <Badge
                key={monthKey}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-secondary/80"
                onClick={() => {
                  const newMonths = filters.seasonMonths?.filter(k => k !== monthKey);
                  updateFilter('seasonMonths', newMonths && newMonths.length > 0 ? newMonths : undefined);
                }}
                style={{
                  backgroundColor: `hsl(${month.color} / 0.15)`,
                  color: `hsl(${month.color})`,
                  borderColor: `hsl(${month.color} / 0.3)`
                }}
              >
                <Calendar className="h-3 w-3" />
                {getMonthLabel(month.key)}
                <X className="h-3 w-3" />
              </Badge>
            ) : null;
          })}

          {filters.inSeasonNow && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => updateFilter('inSeasonNow', false)}
            >
              <Calendar className="w-3 h-3" />
              {t('recipes.filters.inSeasonNow')}
              <X className="w-3 w-3" />
            </Badge>
          )}

          {filters.favorites && (
            <Badge variant="secondary" className="gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {t('recipes.filters.onlyFavorites')}
              <X
                className="w-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                onClick={() => updateFilter('favorites', false)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
