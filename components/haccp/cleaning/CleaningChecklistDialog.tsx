'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupabase } from '@/hooks/useSupabase';
import { toast } from 'sonner';
import { PartialCompletionDialog } from './PartialCompletionDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

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

interface CleaningChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaName: string;
  checklist: ChecklistItem[];
  completionId: string;
  onSuccess: () => void;
}

export function CleaningChecklistDialog({
  open,
  onOpenChange,
  areaName,
  checklist,
  completionId,
  onSuccess,
}: CleaningChecklistDialogProps) {
  const [itemCompletions, setItemCompletions] = useState<ItemCompletion[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPartialDialog, setShowPartialDialog] = useState(false);
  const supabase = useSupabase();

  // Fetch existing item completions
  useEffect(() => {
    if (open && completionId) {
      fetchItemCompletions();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel(`cleaning_items_${completionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'haccp_cleaning_item_completions',
            filter: `completion_id=eq.${completionId}`,
          },
          () => {
            fetchItemCompletions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, completionId]);

  const fetchItemCompletions = async () => {
    try {
      const response = await fetch(`/api/v1/haccp/cleaning-completions/${completionId}/items`);
      if (response.ok) {
        const data = await response.json();
        setItemCompletions(data.item_completions || []);
      }
    } catch (error) {
      console.error('Error fetching item completions:', error);
    }
  };

  const handleToggle = async (itemId: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/haccp/cleaning-completions/${completionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, action: 'toggle' }),
      });

      if (!response.ok) throw new Error('Failed to toggle item');
      
      const data = await response.json();
      setItemCompletions(data.item_completions || []);
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error('Errore durante l\'aggiornamento');
    } finally {
      setIsSaving(false);
    }
  };

  const getItemCompletedBy = (itemId: string) => {
    return itemCompletions.filter(ic => ic.item_id === itemId);
  };

  const isItemFullyCompleted = (itemId: string) => {
    return getItemCompletedBy(itemId).length > 0;
  };

  const allChecked = checklist.every((item) => isItemFullyCompleted(item.id));
  const someChecked = checklist.some((item) => isItemFullyCompleted(item.id));
  const incompleteTasks = checklist.filter(item => !isItemFullyCompleted(item.id)).length;

  const handleCompleteClick = () => {
    if (!allChecked && someChecked) {
      setShowPartialDialog(true);
    } else if (allChecked) {
      handleSubmit('full');
    } else {
      toast.error('Completa almeno un\'attività prima di inviare');
    }
  };

  const handleSubmit = async (completionType: 'full' | 'partial', partialReason?: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/haccp/cleaning-completions/${completionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes || null,
          completion_type: completionType,
          partial_completion_reason: partialReason || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to complete cleaning');

      toast.success(
        completionType === 'full' 
          ? 'Pulizia completata con successo' 
          : 'Pulizia parzialmente completata'
      );
      onSuccess();
      onOpenChange(false);
      setNotes('');
      setItemCompletions([]);
    } catch (error) {
      console.error('Error completing cleaning:', error);
      toast.error('Errore durante il completamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Complete Cleaning - {areaName}</DialogTitle>
          <DialogDescription>
            Check off each item as you complete it. All items must be checked to submit.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {checklist.map((item) => {
                const completedBy = getItemCompletedBy(item.id);
                const isCompleted = completedBy.length > 0;
                
                return (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Checkbox
                      id={item.id}
                      checked={isCompleted}
                      onCheckedChange={() => handleToggle(item.id)}
                      disabled={isSaving}
                    />
                    <div className="flex-1 space-y-2">
                      <label
                        htmlFor={item.id}
                        className="text-sm font-medium leading-none cursor-pointer block"
                      >
                        {item.text}
                      </label>
                      {completedBy.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <div className="flex -space-x-2">
                            {completedBy.slice(0, 3).map((completion) => (
                              <Avatar key={completion.id} className="h-6 w-6 border-2 border-background">
                                <AvatarFallback className="text-xs">
                                  {completion.profiles.full_name?.charAt(0) || completion.profiles.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span>
                            {completedBy.length === 1 
                              ? completedBy[0].profiles.full_name || completedBy[0].profiles.email
                              : `${completedBy.length} utenti`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any observations or issues encountered..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setNotes('');
              setItemCompletions([]);
            }}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
          <Button 
            onClick={handleCompleteClick} 
            disabled={!someChecked || isSubmitting || isSaving}
          >
            {isSubmitting ? 'Invio...' : allChecked ? 'Completa' : 'Completa Parzialmente'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <PartialCompletionDialog
        open={showPartialDialog}
        onOpenChange={setShowPartialDialog}
        onConfirm={(reason) => {
          setShowPartialDialog(false);
          handleSubmit('partial', reason);
        }}
        incompleteTasks={incompleteTasks}
      />
    </Dialog>
  );
}
