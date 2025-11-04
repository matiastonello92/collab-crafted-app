'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Sparkles, MapPin } from 'lucide-react';
import { format } from 'date-fns';

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
  status: 'pending' | 'completed' | 'skipped';
}

interface CleaningAreaCardProps {
  area: CleaningArea;
  completion?: CleaningCompletion;
  onComplete: (areaId: string, completionId: string) => void;
  isCompleting?: boolean;
}

export function CleaningAreaCard({ area, completion, onComplete, isCompleting }: CleaningAreaCardProps) {
  const isCompleted = completion?.status === 'completed';
  const isPending = completion?.status === 'pending';

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    }
    if (isPending) {
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground">{area.name}</h3>
              {getStatusBadge()}
            </div>
            {area.description && (
              <p className="text-sm text-muted-foreground mt-1">{area.description}</p>
            )}
            {area.zone_code && (
              <div className="flex items-center gap-1 mt-2">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Zone: {area.zone_code}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 p-3 rounded-md bg-muted/50">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Checklist ({area.checklist_items.length} items)
        </p>
        <ul className="space-y-1">
          {area.checklist_items.slice(0, 3).map((item) => (
            <li key={item.id} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>{item.text}</span>
            </li>
          ))}
          {area.checklist_items.length > 3 && (
            <li className="text-xs text-muted-foreground italic">
              +{area.checklist_items.length - 3} more items...
            </li>
          )}
        </ul>
      </div>

      {completion && (
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            {isCompleted && completion.completed_at ? (
              <span>Completed {format(new Date(completion.completed_at), 'HH:mm')}</span>
            ) : (
              <span>Scheduled {format(new Date(completion.scheduled_for), 'HH:mm')}</span>
            )}
          </div>
          {isPending && (
            <Button
              size="sm"
              onClick={() => onComplete(area.id, completion.id)}
              disabled={isCompleting}
            >
              {isCompleting ? 'Completing...' : 'Complete'}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
