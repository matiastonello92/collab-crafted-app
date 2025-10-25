'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from './TaskCard';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Search, Filter, Plus } from 'lucide-react';
import Link from 'next/link';

interface TaskListClientProps {
  locationId: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function TaskListClient({ locationId }: TaskListClientProps) {
  const { isMobile } = useBreakpoint();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  let url = `/api/v1/haccp/tasks?location_id=${locationId}&limit=100`;
  if (statusFilter !== 'all') {
    url += `&status=${statusFilter}`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    refreshInterval: 30000
  });

  const tasks = data?.tasks || [];
  const filteredTasks = searchQuery
    ? tasks.filter((task: any) =>
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.area?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">HACCP Tasks</h1>
          <p className="text-muted-foreground">Manage and execute compliance tasks</p>
        </div>
        <Button asChild className="min-h-[44px] w-full sm:w-auto">
          <Link href="/haccp/tasks/new">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'}`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 min-h-[44px]"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 min-h-[44px]">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load tasks</p>
            <Button variant="outline" onClick={() => mutate()} className="mt-4 min-h-[44px]">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No tasks found</p>
            <Button asChild className="min-h-[44px]">
              <Link href="/haccp/templates">Create from Template</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task: any) => (
            <TaskCard key={task.id} task={task} onUpdate={mutate} />
          ))}
        </div>
      )}
    </div>
  );
}
