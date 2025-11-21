'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { CleaningAreaCard } from './CleaningAreaCard';
import { CleaningChecklistDialog } from './CleaningChecklistDialog';
import { CleaningHistoryView } from './CleaningHistoryView';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Settings, Calendar, History } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import Link from 'next/link';

interface CleaningScheduleViewProps {
  locationId: string;
}

interface CleaningArea {
  id: string;
  name: string;
  description: string | null;
  zone_code: string | null;
  cleaning_frequency: string;
  checklist_items: Array<{ id: string; text: string }>;
}

interface CleaningCompletion {
  id: string;
  area_id: string;
  scheduled_for: string;
  completed_at: string | null;
  status: 'pending' | 'completed' | 'skipped' | 'overdue' | 'missed';
  deadline_at: string | null;
  completion_type?: 'full' | 'partial';
  partial_completion_reason?: string | null;
}

interface ChecklistDialogState {
  open: boolean;
  area: CleaningArea | null;
  completion: CleaningCompletion | null;
}

export function CleaningScheduleView({ locationId }: CleaningScheduleViewProps) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [checklistDialog, setChecklistDialog] = useState<ChecklistDialogState>({
    open: false,
    area: null,
    completion: null,
  });
  const [prefetchedItemCompletions, setPrefetchedItemCompletions] = useState<any[]>([]);

  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();

  const { data: areas, isLoading: areasLoading } = useQuery({
    queryKey: ['cleaning-areas', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('haccp_cleaning_areas')
        .select('*')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as CleaningArea[];
    },
  });

  const { data: todayCompletions, isLoading: completionsLoading } = useQuery({
    queryKey: ['cleaning-completions-today', locationId, todayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('haccp_cleaning_completions')
        .select('*, completion_type, partial_completion_reason')
        .eq('location_id', locationId)
        .gte('scheduled_for', todayStart)
        .lte('scheduled_for', todayEnd)
        .neq('status', 'missed')
        .order('scheduled_for');

      if (error) throw error;
      return data as CleaningCompletion[];
    },
    refetchInterval: 30000,
  });

  const completeMutation = useMutation({
    mutationFn: async ({ areaId, completionId }: { areaId: string; completionId: string }) => {
      const area = areas?.find((a) => a.id === areaId);
      const completion = todayCompletions?.find((c) => c.id === completionId);

      if (!area || !completion) throw new Error('Area or completion not found');

      // Pre-fetch item completions before opening dialog
      try {
        const response = await fetch(`/api/v1/haccp/cleaning-completions/${completionId}/items`);
        if (response.ok) {
          const data = await response.json();
          setPrefetchedItemCompletions(data.item_completions || []);
        }
      } catch (error) {
        console.error('Error prefetching item completions:', error);
        setPrefetchedItemCompletions([]);
      }

      setChecklistDialog({ open: true, area, completion });
    },
  });

  const handleComplete = (areaId: string, completionId: string) => {
    completeMutation.mutate({ areaId, completionId });
  };

  const handleChecklistSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['cleaning-completions-today'] });
  };

  // Lightweight interval: only close expired tasks (real-time UI feedback)
  // Task generation is now handled by pg_cron automatic scheduler
  useEffect(() => {
    if (!areas || areas.length === 0) return;
    
    const closeExpiredTasks = async () => {
      try {
        await supabase.rpc('close_expired_cleaning_tasks');
        queryClient.invalidateQueries({ queryKey: ['cleaning-completions-today'] });
      } catch (err) {
        console.error('Failed to close expired tasks:', err);
      }
    };
    
    // Initial run
    closeExpiredTasks();
    
    // Run every 5 minutes for real-time UI updates
    const interval = setInterval(closeExpiredTasks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [areas, supabase, queryClient]);

  if (areasLoading || completionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!areas || areas.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No cleaning areas configured.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Configure cleaning areas to start tracking your cleaning schedule.
        </p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/haccp/cleaning-plan/config">
            <Settings className="w-4 h-4 mr-2" />
            Configure Areas
          </Link>
        </Button>
      </Card>
    );
  }

  const pendingCompletions = todayCompletions?.filter((c) => c.status === 'pending' || c.status === 'overdue') || [];
  const completedCompletions = todayCompletions?.filter((c) => c.status === 'completed') || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Cleaning Schedule</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/haccp/cleaning-plan/config">
            <Settings className="w-4 h-4 mr-2" />
            Configure Areas
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pendingCompletions.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedCompletions.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingCompletions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">All cleaning tasks completed for today!</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingCompletions.map((completion) => {
                const area = areas.find((a) => a.id === completion.area_id);
                if (!area) return null;
                return (
                  <CleaningAreaCard
                    key={completion.id}
                    area={area}
                    completion={completion}
                    onComplete={handleComplete}
                    isCompleting={completeMutation.isPending}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedCompletions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No completed cleanings yet today.</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedCompletions.map((completion) => {
                const area = areas.find((a) => a.id === completion.area_id);
                if (!area) return null;
                return (
                  <CleaningAreaCard
                    key={completion.id}
                    area={area}
                    completion={completion}
                    onComplete={handleComplete}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <CleaningHistoryView locationId={locationId} />
        </TabsContent>
      </Tabs>

      {checklistDialog.open && checklistDialog.area && checklistDialog.completion && (
        <CleaningChecklistDialog
          open={checklistDialog.open}
          onOpenChange={(open) => {
            setChecklistDialog({ ...checklistDialog, open });
            if (!open) setPrefetchedItemCompletions([]);
          }}
          areaName={checklistDialog.area.name}
          checklist={checklistDialog.area.checklist_items}
          completionId={checklistDialog.completion.id}
          onSuccess={handleChecklistSuccess}
          initialItemCompletions={prefetchedItemCompletions}
        />
      )}
    </div>
  );
}
