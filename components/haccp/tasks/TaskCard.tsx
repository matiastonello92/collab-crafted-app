'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Clock, AlertCircle, CheckCircle2, MapPin, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface TaskCardProps {
  task: any;
  onUpdate?: () => void;
}

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

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const { isMobile } = useBreakpoint();
  const isOverdue = new Date(task.due_at) < new Date() && task.status === 'pending';
  const actualStatus = isOverdue ? 'overdue' : task.status;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'}`}>
          {/* Left: Task Info */}
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              <div className="flex-1">
                <Link href={`/haccp/tasks/${task.id}`}>
                  <h3 className="font-semibold text-lg hover:underline">{task.name}</h3>
                </Link>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                )}
              </div>
              {isOverdue && <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Due: {format(new Date(task.due_at), 'MMM dd, HH:mm')}</span>
              </div>

              {task.area && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{task.area}</span>
                </div>
              )}

              {task.equipment?.name && (
                <div className="flex items-center gap-1">
                  <Wrench className="h-4 w-4" />
                  <span>{task.equipment.name}</span>
                </div>
              )}

              {task.assigned?.full_name && (
                <span>Assigned: {task.assigned.full_name}</span>
              )}
            </div>
          </div>

          {/* Right: Status & Actions */}
          <div className={`flex ${isMobile ? 'justify-between items-center' : 'flex-col gap-2 items-end'}`}>
            <div className="flex gap-2">
              <Badge variant="outline" className={priorityColors[task.priority]}>
                {task.priority}
              </Badge>
              <Badge variant="outline" className={statusColors[actualStatus]}>
                {actualStatus}
              </Badge>
            </div>

            {task.status === 'pending' && (
              <Button asChild size="sm" className="min-h-[44px]">
                <Link href={`/haccp/tasks/${task.id}`}>
                  Execute
                </Link>
              </Button>
            )}

            {task.status === 'completed' && (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Completed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
