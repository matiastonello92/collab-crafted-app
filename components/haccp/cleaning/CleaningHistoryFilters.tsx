'use client';

import { useState } from 'react';
import { Calendar, Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CleaningArea {
  id: string;
  name: string;
  zone_code: string | null;
}

export type CleaningStatus = 'completed' | 'missed' | 'partial' | 'overdue' | 'skipped';

interface CleaningHistoryFiltersProps {
  areas: CleaningArea[];
  onFiltersChange: (filters: {
    statuses: CleaningStatus[];
    dateRange: { from: Date; to: Date };
    searchTerm: string;
    areaId: string | null;
  }) => void;
  initialDateRange: { from: Date; to: Date };
}

const STATUS_OPTIONS: { value: CleaningStatus; label: string; color: string }[] = [
  { value: 'completed', label: 'Completed', color: 'text-green-700' },
  { value: 'partial', label: 'Partial', color: 'text-amber-700' },
  { value: 'missed', label: 'Missed', color: 'text-red-700' },
  { value: 'overdue', label: 'Overdue', color: 'text-orange-700' },
  { value: 'skipped', label: 'Skipped', color: 'text-gray-700' },
];

export function CleaningHistoryFilters({
  areas,
  onFiltersChange,
  initialDateRange,
}: CleaningHistoryFiltersProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(initialDateRange);
  const [selectedStatuses, setSelectedStatuses] = useState<CleaningStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    const newRange = {
      from: range.from || dateRange.from,
      to: range.to || dateRange.to,
    };
    setDateRange(newRange);
    onFiltersChange({
      statuses: selectedStatuses,
      dateRange: newRange,
      searchTerm,
      areaId: selectedAreaId,
    });
  };

  const handleStatusToggle = (status: CleaningStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    setSelectedStatuses(newStatuses);
    onFiltersChange({
      statuses: newStatuses,
      dateRange,
      searchTerm,
      areaId: selectedAreaId,
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({
      statuses: selectedStatuses,
      dateRange,
      searchTerm: value,
      areaId: selectedAreaId,
    });
  };

  const handleAreaChange = (value: string) => {
    const areaId = value === 'all' ? null : value;
    setSelectedAreaId(areaId);
    onFiltersChange({
      statuses: selectedStatuses,
      dateRange,
      searchTerm,
      areaId,
    });
  };

  const handleClearFilters = () => {
    setSelectedStatuses([]);
    setSearchTerm('');
    setSelectedAreaId(null);
    setDateRange(initialDateRange);
    onFiltersChange({
      statuses: [],
      dateRange: initialDateRange,
      searchTerm: '',
      areaId: null,
    });
  };

  const hasActiveFilters =
    selectedStatuses.length > 0 || searchTerm !== '' || selectedAreaId !== null;

  const presets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 3 months', days: 90 },
  ];

  const handlePresetClick = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    handleDateRangeChange({ from, to });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1 w-full">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by area or zone..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Area Filter */}
          <Select value={selectedAreaId || 'all'} onValueChange={handleAreaChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Status
                {selectedStatuses.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {selectedStatuses.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-3">
                <div className="font-medium text-sm">Filter by status</div>
                {STATUS_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={selectedStatuses.includes(option.value)}
                      onCheckedChange={() => handleStatusToggle(option.value)}
                    />
                    <label
                      htmlFor={`status-${option.value}`}
                      className={cn('text-sm font-medium cursor-pointer', option.color)}
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b space-y-2">
                <div className="font-medium text-sm">Quick presets</div>
                <div className="flex gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.days}
                      variant="outline"
                      size="sm"
                      onClick={() => handlePresetClick(preset.days)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="p-3">
                <Label className="text-xs text-muted-foreground mb-2 block">From</Label>
                <CalendarComponent
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => date && handleDateRangeChange({ from: date })}
                  disabled={(date) => date > new Date() || date > dateRange.to}
                  initialFocus
                  className="pointer-events-auto"
                />
                <Label className="text-xs text-muted-foreground mb-2 block mt-4">To</Label>
                <CalendarComponent
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => date && handleDateRangeChange({ to: date })}
                  disabled={(date) => date > new Date() || date < dateRange.from}
                  className="pointer-events-auto"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
