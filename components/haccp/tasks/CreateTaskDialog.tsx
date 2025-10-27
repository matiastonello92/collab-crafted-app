'use client';

import { useState, FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateTaskDialogProps {
  locationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateTaskDialog({ locationId, open, onOpenChange, onCreated }: CreateTaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    task_type: 'checklist',
    area: '',
    due_at: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.due_at) {
      toast.error('Task name and due date are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/haccp/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          location_id: locationId,
          name: formData.name,
          description: formData.description || null,
          priority: formData.priority,
          task_type: formData.task_type,
          area: formData.area || null,
          due_at: new Date(formData.due_at).toISOString(),
          checklist_items: [],
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create task');
      }

      toast.success('Task created successfully');

      // Reset form
      setFormData({
        name: '',
        description: '',
        priority: 'medium',
        task_type: 'checklist',
        area: '',
        due_at: '',
      });

      onCreated(); // Refresh task list
      onOpenChange(false); // Close dialog
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New HACCP Task</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new compliance task
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Task Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Temperature Check - Cold Room"
              required
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about this task..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger id="priority" className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task_type">Task Type</Label>
              <Select
                value={formData.task_type}
                onValueChange={(value) => setFormData({ ...formData, task_type: value })}
              >
                <SelectTrigger id="task_type" className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checklist">Checklist</SelectItem>
                  <SelectItem value="temperature">Temperature</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">Area</Label>
            <Input
              id="area"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              placeholder="e.g., Kitchen, Cold Storage, Production Area"
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_at">Due Date & Time *</Label>
            <Input
              id="due_at"
              type="datetime-local"
              value={formData.due_at}
              onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
              required
              className="min-h-[44px]"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-h-[44px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
