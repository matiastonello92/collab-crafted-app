'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Calendar, Clock, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface ChecklistItem {
  id: string;
  text: string;
}

interface ItemCompletion {
  id: string;
  item_id: string;
  completed_by: string;
  completed_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

interface CleaningDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completion: {
    id: string;
    scheduled_for: string;
    completed_at: string | null;
    deadline_at: string | null;
    status: string;
    completion_type?: 'full' | 'partial';
    partial_completion_reason?: string | null;
    notes?: string | null;
    area: {
      name: string;
      zone_code: string | null;
      description: string | null;
      frequency: string;
      checklist_items: ChecklistItem[];
    };
  };
}

export function CleaningDetailsDialog({
  open,
  onOpenChange,
  completion,
}: CleaningDetailsDialogProps) {
  const [itemCompletions, setItemCompletions] = useState<ItemCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && completion.id) {
      fetchItemCompletions();
    }
  }, [open, completion.id]);

  const fetchItemCompletions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/haccp/cleaning-completions/${completion.id}/items`);
      if (response.ok) {
        const data = await response.json();
        setItemCompletions(data.item_completions || []);
      }
    } catch (error) {
      console.error('Error fetching item completions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isItemCompleted = (itemId: string) => {
    return itemCompletions.some((ic) => ic.item_id === itemId);
  };

  const getStatusBadge = () => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      completed: {
        label: completion.completion_type === 'partial' ? 'Partial' : 'Completed',
        className: completion.completion_type === 'partial' 
          ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
          : 'bg-green-500/10 text-green-700 border-green-500/20',
      },
      missed: {
        label: 'Missed',
        className: 'bg-red-500/10 text-red-700 border-red-500/20',
      },
      overdue: {
        label: 'Overdue',
        className: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
      },
      skipped: {
        label: 'Skipped',
        className: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
      },
    };

    const config = statusConfig[completion.status] || statusConfig.completed;
    return <Badge className={cn('border', config.className)}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl">{completion.area.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {completion.area.zone_code && (
                  <span className="text-muted-foreground">Zone: {completion.area.zone_code}</span>
                )}
              </DialogDescription>
            </div>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-6 py-4">
            {/* Timeline Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">Scheduled</div>
                  <div className="text-sm font-medium">
                    {format(new Date(completion.scheduled_for), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
              </div>

              {completion.completed_at && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">Completed</div>
                    <div className="text-sm font-medium">
                      {format(new Date(completion.completed_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              )}

              {completion.deadline_at && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">Deadline</div>
                    <div className="text-sm font-medium">
                      {format(new Date(completion.deadline_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Checklist Items */}
            <div className="space-y-3">
              <div className="font-medium text-sm">Checklist Items</div>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading checklist...</div>
              ) : (
                <div className="space-y-2">
                  {completion.area.checklist_items.map((item) => {
                    const isCompleted = isItemCompleted(item.id);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg border',
                          isCompleted ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/30'
                        )}
                      >
                        <CheckCircle2
                          className={cn(
                            'h-5 w-5 shrink-0',
                            isCompleted ? 'text-green-600' : 'text-muted-foreground/30'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm flex-1',
                            isCompleted ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {item.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Partial Completion Reason */}
            {completion.completion_type === 'partial' && completion.partial_completion_reason && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="font-medium text-sm">Partial Completion Reason</div>
                  <div className="text-sm text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                    {completion.partial_completion_reason}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {completion.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Notes
                  </div>
                  <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                    {completion.notes}
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Frequency:</span> {completion.area.frequency}
              </div>
              {completion.area.description && (
                <div className="col-span-2">
                  <span className="font-medium">Description:</span> {completion.area.description}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
