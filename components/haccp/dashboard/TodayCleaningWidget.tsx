'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
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
        .select('*')
        .eq('location_id', locationId)
        .gte('scheduled_for', today.toISOString())
        .lt('scheduled_for', tomorrow.toISOString());

      if (error) throw error;

      const pending = completions?.filter(c => c.status === 'pending').length || 0;
      const completed = completions?.filter(c => c.status === 'completed').length || 0;
      const overdue = completions?.filter(c => c.status === 'overdue').length || 0;

      return {
        total: completions?.length || 0,
        pending,
        completed,
        overdue,
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

  const { total = 0, pending = 0, completed = 0, overdue = 0 } = data || {};

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
        <Button asChild variant="outline" size="sm" className="w-full mt-2">
          <Link href="/haccp/cleaning-plan">View Schedule</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
