'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskExecutionForm } from './TaskExecutionForm';
import { TaskEvidenceList } from './TaskEvidenceList';
import { SkipTaskDialog } from './SkipTaskDialog';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { ArrowLeft, Clock, MapPin, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface TaskDetailClientProps {
  taskId: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function TaskDetailClient({ taskId }: TaskDetailClientProps) {
  const { isMobile } = useBreakpoint();
  const router = useRouter();
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/haccp/tasks/${taskId}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error || !data?.task) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Task Not Found</h2>
        <Button asChild className="mt-4 min-h-[44px]">
          <Link href="/haccp/tasks">Back to Tasks</Link>
        </Button>
      </div>
    );
  }

  const task = data.task;
  const isOverdue = new Date(task.due_at) < new Date() && task.status === 'pending';
  const canExecute = ['pending', 'in_progress'].includes(task.status);

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          asChild
          className="mb-4 min-h-[44px]"
        >
          <Link href="/haccp/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{task.name}</h1>
            {task.description && (
              <p className="text-muted-foreground">{task.description}</p>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Badge variant="outline" className="text-base px-3 py-1">
              {task.priority}
            </Badge>
            <Badge 
              variant={task.status === 'completed' ? 'default' : 'outline'}
              className="text-base px-3 py-1"
            >
              {isOverdue ? 'overdue' : task.status}
            </Badge>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Due: {format(new Date(task.due_at), 'MMM dd, yyyy HH:mm')}</span>
          </div>

          {task.area && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{task.area}</span>
            </div>
          )}

          {task.equipment && (
            <div className="flex items-center gap-1">
              <Wrench className="h-4 w-4" />
              <span>{task.equipment.name} ({task.equipment.type})</span>
            </div>
          )}
        </div>

        {isOverdue && (
          <div className="mt-4 p-3 rounded-lg border border-destructive/50 bg-destructive/10 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm text-destructive font-medium">This task is overdue</span>
          </div>
        )}

        {task.status === 'completed' && (
          <div className="mt-4 p-3 rounded-lg border border-green-500/50 bg-green-500/10 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-600 font-medium">
              Completed on {format(new Date(task.completed_at), 'MMM dd, yyyy HH:mm')}
              {task.completed_by_user && ` by ${task.completed_by_user.full_name}`}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <Tabs defaultValue="execute" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <TabsTrigger value="execute" className="min-h-[44px]">Execute</TabsTrigger>
          <TabsTrigger value="evidences" className="min-h-[44px]">
            Evidences ({task.evidences?.length || 0})
          </TabsTrigger>
          {!isMobile && <TabsTrigger value="history" className="min-h-[44px]">History</TabsTrigger>}
        </TabsList>

        <TabsContent value="execute" className="mt-6">
          {canExecute ? (
            <TaskExecutionForm task={task} onComplete={() => mutate()} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Task {task.status}</CardTitle>
                <CardDescription>
                  This task cannot be executed in its current state
                </CardDescription>
              </CardHeader>
              <CardContent>
                {task.skip_reason && (
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm font-medium mb-1">Skip Reason:</p>
                    <p className="text-sm text-muted-foreground">{task.skip_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {canExecute && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => setShowSkipDialog(true)}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Skip This Task
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="evidences" className="mt-6">
          <TaskEvidenceList taskId={taskId} evidences={task.evidences || []} onUpdate={mutate} />
        </TabsContent>

        {!isMobile && (
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Task History</CardTitle>
                <CardDescription>Timeline of all actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="text-sm font-medium">Task created</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>

                  {task.started_at && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium">Task started</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(task.started_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}

                  {task.completed_at && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium">Task completed</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(task.completed_at), 'MMM dd, yyyy HH:mm')}
                          {task.completed_by_user && ` by ${task.completed_by_user.full_name}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <SkipTaskDialog
        open={showSkipDialog}
        onOpenChange={setShowSkipDialog}
        taskId={taskId}
        onSkipped={() => {
          setShowSkipDialog(false);
          mutate();
        }}
      />
    </div>
  );
}
