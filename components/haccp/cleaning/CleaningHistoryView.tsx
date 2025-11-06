'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, History, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { CleaningHistoryFilters, CleaningStatus } from './CleaningHistoryFilters';
import { CleaningAreaCard } from './CleaningAreaCard';
import { CleaningDetailsDialog } from './CleaningDetailsDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CleaningHistoryViewProps {
  locationId: string;
}

interface CleaningArea {
  id: string;
  name: string;
  zone_code: string | null;
  description: string | null;
  frequency: string;
  cleaning_frequency: string;
  checklist_items: Array<{ id: string; text: string }>;
}

interface CleaningCompletion {
  id: string;
  area_id: string;
  scheduled_for: string;
  completed_at: string | null;
  deadline_at: string | null;
  status: 'completed' | 'missed' | 'overdue' | 'pending' | 'skipped';
  completion_type?: 'full' | 'partial';
  partial_completion_reason?: string | null;
  notes?: string | null;
  area: CleaningArea;
}

export function CleaningHistoryView({ locationId }: CleaningHistoryViewProps) {
  const initialDateRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30); // Default: last 30 days
    return { from, to };
  }, []);

  const [filters, setFilters] = useState<{
    statuses: CleaningStatus[];
    dateRange: { from: Date; to: Date };
    searchTerm: string;
    areaId: string | null;
  }>({
    statuses: [],
    dateRange: initialDateRange,
    searchTerm: '',
    areaId: null,
  });

  const [selectedCompletion, setSelectedCompletion] = useState<CleaningCompletion | null>(null);

  // Fetch areas for filter dropdown
  const { data: areas = [] } = useQuery<CleaningArea[]>({
    queryKey: ['cleaning-areas', locationId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/haccp/cleaning-areas?location_id=${locationId}`);
      if (!response.ok) throw new Error('Failed to fetch areas');
      const data = await response.json();
      return data.areas || [];
    },
  });

  // Fetch history completions
  const {
    data: completions = [],
    isLoading,
    error,
  } = useQuery<CleaningCompletion[]>({
    queryKey: [
      'cleaning-history',
      locationId,
      filters.dateRange.from.toISOString(),
      filters.dateRange.to.toISOString(),
      filters.statuses,
      filters.areaId,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        location_id: locationId,
        from: filters.dateRange.from.toISOString(),
        to: filters.dateRange.to.toISOString(),
      });

      // Add status filter if selected
      if (filters.statuses.length > 0) {
        params.append('status', filters.statuses.join(','));
      }

      // Add area filter if selected
      if (filters.areaId) {
        params.append('area_id', filters.areaId);
      }

      const response = await fetch(`/api/v1/haccp/cleaning-completions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      return data.completions || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Apply local search filter
  const filteredCompletions = useMemo(() => {
    let filtered = completions;

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (completion) =>
          completion.area.name.toLowerCase().includes(searchLower) ||
          completion.area.zone_code?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by scheduled_for descending (most recent first)
    return filtered.sort(
      (a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime()
    );
  }, [completions, filters.searchTerm]);

  const handleCardClick = (completion: CleaningCompletion) => {
    setSelectedCompletion(completion);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed': return 'default';
      case 'missed': return 'destructive';
      case 'overdue': return 'destructive';
      case 'pending': return 'secondary';
      case 'skipped': return 'outline';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load cleaning history. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <CleaningHistoryFilters
        areas={areas}
        onFiltersChange={setFilters}
        initialDateRange={initialDateRange}
      />

      {/* Results */}
      {filteredCompletions.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="rounded-full bg-muted p-4">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">No history found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                No cleaning records found for the selected filters. Try adjusting your date range or
                clearing filters.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Results count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {filteredCompletions.length} {filteredCompletions.length === 1 ? 'record' : 'records'}{' '}
              found
            </span>
          </div>

          {/* Table view */}
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[80px]">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompletions.map((completion) => (
                  <TableRow 
                    key={completion.id}
                    onClick={() => handleCardClick(completion)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{completion.area.name}</div>
                        {completion.area.zone_code && (
                          <div className="text-xs text-muted-foreground">
                            Zone: {completion.area.zone_code}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {completion.area.cleaning_frequency}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-sm">
                      {format(new Date(completion.scheduled_for), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    
                    <TableCell className="text-sm">
                      {completion.completed_at 
                        ? format(new Date(completion.completed_at), 'dd/MM/yyyy HH:mm')
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={getStatusVariant(completion.status)}>
                        {completion.status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {completion.completion_type && (
                        <Badge 
                          variant={completion.completion_type === 'full' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {completion.completion_type}
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Details Dialog */}
      {selectedCompletion && (
        <CleaningDetailsDialog
          open={!!selectedCompletion}
          onOpenChange={(open) => !open && setSelectedCompletion(null)}
          completion={selectedCompletion}
        />
      )}
    </div>
  );
}
