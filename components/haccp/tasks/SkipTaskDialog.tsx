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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { hapticHeavy } from '@/lib/capacitor/native';

interface SkipTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  onSkipped: () => void;
}

export function SkipTaskDialog({ open, onOpenChange, taskId, onSkipped }: SkipTaskDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSkip = async () => {
    if (reason.trim().length < 10) {
      toast.error('Please provide a detailed reason (minimum 10 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/haccp/tasks/${taskId}/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip_reason: reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to skip task');
      }

      await hapticHeavy();
      toast.success('Task skipped');
      setReason('');
      onSkipped();
    } catch (error: any) {
      console.error('Skip error:', error);
      toast.error(error.message || 'Failed to skip task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skip This Task</DialogTitle>
          <DialogDescription>
            Provide a detailed reason for skipping this compliance task. This will be recorded in the audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="skip-reason">
              Skip Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="skip-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this task cannot be completed (minimum 10 characters)..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {reason.length} / 10 characters minimum
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSkip}
            disabled={isSubmitting || reason.trim().length < 10}
            className="min-h-[44px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Skipping...
              </>
            ) : (
              'Skip Task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
