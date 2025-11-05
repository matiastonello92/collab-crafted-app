'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface TodayCleaningWidgetProps {
  locationId: string;
}

export function TodayCleaningWidget({ locationId }: TodayCleaningWidgetProps) {
  const supabase = useSupabase();

  const { data, isLoading } = useQuery({
    queryKey: ['cleaning-status-today', locationId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: completions, error } = await supabase
        .from('haccp_cleaning_completions')
        .select('*, completion_type')
        .eq('location_id', locationId)
        .gte('scheduled_for', today.toISOString())
        .lt('scheduled_for', tomorrow.toISOString())
        .neq('status', 'missed');

      if (error) throw error;

      const pending = completions?.filter(c => c.status === 'pending').length || 0;
      const completed = completions?.filter(c => c.status === 'completed' && c.completion_type === 'full').length || 0;
      const partial = completions?.filter(c => c.status === 'completed' && c.completion_type === 'partial').length || 0;
      const overdue = completions?.filter(c => c.status === 'overdue').length || 0;

      // Get missed tasks from last 7 days for reporting
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: missedData, error: missedError } = await supabase
        .from('haccp_cleaning_completions')
        .select('*')
        .eq('location_id', locationId)
        .eq('status', 'missed')
        .gte('scheduled_for', weekAgo.toISOString())
        .lt('scheduled_for', today.toISOString());

      if (missedError) throw missedError;

      return {
        total: completions?.length || 0,
        pending,
        completed,
        partial,
        overdue,
        missed: missedData?.length || 0,
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Cleaning Schedule Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const { total = 0, pending = 0, completed = 0, partial = 0, overdue = 0, missed = 0 } = data || {};

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Cleaning Schedule Today</CardTitle>
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Tasks</span>
          <span className="text-2xl font-bold">{total}</span>
        </div>
        {pending > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Pending</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {pending}
            </Badge>
          </div>
        )}
        {completed > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm">Completed</span>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {completed}
            </Badge>
          </div>
        )}
        {partial > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm">Partial</span>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {partial}
            </Badge>
          </div>
        )}
        {overdue > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm">Overdue</span>
            </div>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {overdue}
            </Badge>
          </div>
        )}
        {missed > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Missed This Week</span>
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
              {missed}
            </Badge>
          </div>
        )}
        <Button asChild variant="outline" size="sm" className="w-full mt-2">
          <Link href="/haccp/cleaning-plan">View Schedule</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
