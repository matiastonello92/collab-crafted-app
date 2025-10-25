'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface TasksOverviewProps {
  locationId: string;
}

interface HaccpTask {
  id: string;
  name: string;
  task_type: string;
  status: string;
  priority: string;
  due_at: string;
  area?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  in_progress: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-700 border-green-500/20',
  skipped: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  overdue: 'bg-red-500/10 text-red-700 border-red-500/20',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-700',
  medium: 'bg-blue-500/10 text-blue-700',
  high: 'bg-orange-500/10 text-orange-700',
  critical: 'bg-red-500/10 text-red-700',
};

export function TasksOverview({ locationId }: TasksOverviewProps) {
  const { isMobile } = useBreakpoint();
  const [filter, setFilter] = useState<'today' | 'overdue' | 'pending'>('today');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Build URL based on filter
  let url = `/api/v1/haccp/tasks?location_id=${locationId}&limit=10`;
  if (filter === 'today') {
    url += '&status=pending';
  } else if (filter === 'overdue') {
    url += '&status=pending';
  } else {
    url += '&status=pending';
  }

  const { data, error, isLoading } = useSWR(url, fetcher, { refreshInterval: 30000 });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load tasks</p>
        </CardContent>
      </Card>
    );
  }

  const tasks: HaccpTask[] = data?.tasks || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tasks</CardTitle>
        <CardDescription>Track your HACCP tasks and compliance</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <Button
            variant={filter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('today')}
            className="min-h-[44px] whitespace-nowrap"
          >
            Today
          </Button>
          <Button
            variant={filter === 'overdue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('overdue')}
            className="min-h-[44px] whitespace-nowrap"
          >
            Overdue
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className="min-h-[44px] whitespace-nowrap"
          >
            All Pending
          </Button>
        </div>

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tasks found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isOverdue = new Date(task.due_at) < new Date() && task.status === 'pending';
              const actualStatus = isOverdue ? 'overdue' : task.status;

              return (
                <Link key={task.id} href={`/haccp/tasks/${task.id}`}>
                  <div className={`p-4 rounded-lg border ${isMobile ? 'space-y-2' : 'flex items-center justify-between'} hover:bg-accent transition-colors`}>
                    <div className="flex-1">
                      <div className="flex items-start gap-2 mb-1">
                        <h4 className="font-medium text-sm">{task.name}</h4>
                        {isOverdue && <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(task.due_at), 'MMM dd, HH:mm')}</span>
                        {task.area && <span>• {task.area}</span>}
                      </div>
                    </div>
                    <div className={`flex ${isMobile ? 'justify-between' : 'gap-2'} items-center`}>
                      <Badge variant="outline" className={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                      <Badge variant="outline" className={statusColors[actualStatus]}>
                        {actualStatus}
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          <Button asChild variant="outline" className="w-full min-h-[44px]">
            <Link href="/haccp/tasks">View All Tasks</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
