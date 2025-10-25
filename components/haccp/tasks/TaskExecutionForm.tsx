'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { hapticMedium } from '@/lib/capacitor/native';

interface TaskExecutionFormProps {
  task: any;
  onComplete: () => void;
}

export function TaskExecutionForm({ task, onComplete }: TaskExecutionFormProps) {
  const { isMobile } = useBreakpoint();
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checklistItems = task.checklist_items || [];

  const handleResponseChange = (index: number, value: any) => {
    setResponses(prev => ({ ...prev, [index]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      const requiredItems = checklistItems.filter((item: any) => item.required);
      const missingRequired = requiredItems.some(
        (item: any, idx: number) => !responses[idx] && responses[idx] !== 0
      );

      if (missingRequired) {
        toast.error('Please complete all required checklist items');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/v1/haccp/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_responses: responses,
          notes,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to complete task');
      }

      await hapticMedium();
      toast.success('Task completed successfully');
      onComplete();
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast.error(error.message || 'Failed to complete task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Task Checklist</CardTitle>
          <CardDescription>Complete all required items to finish this task</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {checklistItems.map((item: any, index: number) => (
            <div key={index} className="space-y-2">
              <Label className="text-base">
                {item.label}
                {item.required && <span className="text-destructive ml-1">*</span>}
              </Label>

              {item.type === 'checkbox' && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`item-${index}`}
                    checked={responses[index] === true}
                    onCheckedChange={(checked) => handleResponseChange(index, checked)}
                    className="min-h-[24px] min-w-[24px]"
                  />
                  <Label htmlFor={`item-${index}`} className="text-sm text-muted-foreground">
                    Confirmed
                  </Label>
                </div>
              )}

              {item.type === 'number' && (
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="0.1"
                    value={responses[index] || ''}
                    onChange={(e) => handleResponseChange(index, parseFloat(e.target.value) || 0)}
                    placeholder={`Enter ${item.label.toLowerCase()}`}
                    className="min-h-[44px]"
                    required={item.required}
                  />
                  {item.unit && (
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {item.unit}
                    </span>
                  )}
                </div>
              )}

              {item.type === 'text' && (
                <Input
                  type="text"
                  value={responses[index] || ''}
                  onChange={(e) => handleResponseChange(index, e.target.value)}
                  placeholder={`Enter ${item.label.toLowerCase()}`}
                  className="min-h-[44px]"
                  required={item.required}
                />
              )}
            </div>
          ))}

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional observations or comments..."
              rows={isMobile ? 3 : 4}
              className="resize-none"
            />
          </div>

          <Button
            type="submit"
            className="w-full min-h-[44px]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              'Complete Task'
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
