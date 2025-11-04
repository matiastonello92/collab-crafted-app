'use client';

import { useState } from 'react';
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

interface ChecklistItem {
  id: string;
  text: string;
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
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = useSupabase();

  const handleToggle = (itemId: string) => {
    setResponses((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const allChecked = checklist.every((item) => responses[item.id]);

  const handleSubmit = async () => {
    if (!allChecked) {
      toast.error('Please complete all checklist items');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('haccp_cleaning_completions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          checklist_responses: responses,
          notes: notes || null,
        })
        .eq('id', completionId);

      if (error) throw error;

      toast.success('Cleaning completed successfully');
      onSuccess();
      onOpenChange(false);
      setResponses({});
      setNotes('');
    } catch (error) {
      console.error('Error completing cleaning:', error);
      toast.error('Failed to complete cleaning');
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
              {checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <Checkbox
                    id={item.id}
                    checked={responses[item.id] || false}
                    onCheckedChange={() => handleToggle(item.id)}
                  />
                  <label
                    htmlFor={item.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                  >
                    {item.text}
                  </label>
                </div>
              ))}
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
              setResponses({});
              setNotes('');
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!allChecked || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Completion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
