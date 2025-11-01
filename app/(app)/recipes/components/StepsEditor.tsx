'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Save, X, Clock, ListChecks, GripVertical, Edit, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { StepPhotoUploader } from './StepPhotoUploader';
import { RecipeStepImage } from './RecipeStepImage';
import { useTranslation } from '@/lib/i18n';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RecipeStep {
  id?: string;
  step_number: number;
  title?: string;
  instruction: string;
  timer_minutes?: number;
  checklist_items?: string[];
  photo_url?: string;
}

interface StepsEditorProps {
  recipeId: string;
  steps: RecipeStep[];
  readOnly?: boolean;
  onStepsChange?: () => void;
}

export function StepsEditor({ recipeId, steps, readOnly = false, onStepsChange }: StepsEditorProps) {
  const { t } = useTranslation();
  const [localSteps, setLocalSteps] = useState<RecipeStep[]>(steps);
  const [editingStep, setEditingStep] = useState<Partial<RecipeStep> | null>(null);
  const [checklistInput, setChecklistInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRenumberDialog, setShowRenumberDialog] = useState(false);
  const [pendingStepNumber, setPendingStepNumber] = useState<number | null>(null);

  const sortedSteps = [...localSteps].sort((a, b) => a.step_number - b.step_number);

  // Setup drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleStartAdd() {
    const nextNumber = Math.max(0, ...localSteps.map(s => s.step_number)) + 1;
    
    setLoading(true);
    try {
      // Create step immediately in DB with default values
      const response = await fetch(`/api/v1/recipes/${recipeId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_number: nextNumber,
          instruction: 'Nuovo step',
          timer_minutes: 0,
          checklist_items: []
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t('recipes.steps.errorSaving'));
      }

      const { step } = await response.json();
      
      // Add to local state and start editing
      setLocalSteps([...localSteps, step]);
      setEditingStep(step);
      
      toast.success(t('recipes.steps.readyToAdd'));
    } catch (error) {
      console.error('Error creating step:', error);
      toast.error(t('recipes.steps.errorSaving'));
    } finally {
      setLoading(false);
    }
  }

  async function handleInsertAfter(afterStepNumber: number) {
    setLoading(true);
    try {
      // Update all steps with step_number > afterStepNumber
      const stepsToUpdate = localSteps.filter(s => s.step_number > afterStepNumber);
      
      await Promise.all(
        stepsToUpdate.map((step) =>
          fetch(`/api/v1/recipes/${recipeId}/steps/${step.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step_number: step.step_number + 1 }),
          })
        )
      );

      // Update local state
      const updatedSteps = localSteps.map(s =>
        s.step_number > afterStepNumber
          ? { ...s, step_number: s.step_number + 1 }
          : s
      );

      // Create new step immediately in DB
      const response = await fetch(`/api/v1/recipes/${recipeId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_number: afterStepNumber + 1,
          instruction: 'Nuovo step',
          timer_minutes: 0,
          checklist_items: []
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t('recipes.steps.errorSaving'));
      }

      const { step } = await response.json();
      
      // Add to local state and start editing
      setLocalSteps([...updatedSteps, step]);
      setEditingStep(step);

      toast.success(t('recipes.steps.readyToAdd'));
      onStepsChange?.();
    } catch (error) {
      console.error('Error preparing to insert step:', error);
      toast.error(t('recipes.steps.errorInserting'));
    } finally {
      setLoading(false);
    }
  }

  function handleStepNumberChange(newStepNumber: number) {
    if (!editingStep) return;
    
    const oldStepNumber = editingStep.step_number;
    if (oldStepNumber === undefined || oldStepNumber === newStepNumber) return;
    
    // Check if newStepNumber is already taken by another step
    const isNumberTaken = localSteps.some(
      s => s.id !== editingStep.id && s.step_number === newStepNumber
    );
    
    if (isNumberTaken) {
      // Open confirmation dialog
      setPendingStepNumber(newStepNumber);
      setShowRenumberDialog(true);
    } else {
      // No conflict, update directly
      setEditingStep({ ...editingStep, step_number: newStepNumber });
    }
  }

  async function confirmStepNumberChange() {
    if (!editingStep || pendingStepNumber === null) return;
    
    const oldStepNumber = editingStep.step_number;
    const newStepNumber = pendingStepNumber;
    
    setShowRenumberDialog(false);
    setPendingStepNumber(null);
    setLoading(true);
    
    try {
      // For NEW steps (without id): renumber existing steps, then auto-save
      if (!editingStep.id) {
        const stepsToUpdate = localSteps.filter(
          s => s.id && s.step_number >= newStepNumber
        );
        
        console.log('[confirmStepNumberChange] Renumbering steps:', stepsToUpdate.map(s => `${s.step_number} -> ${s.step_number + 1}`));
        
        // Step 1: Renumber existing steps with proper error checking
        const patchResults = await Promise.all(
          stepsToUpdate.map(async (step) => {
            const response = await fetch(`/api/v1/recipes/${recipeId}/steps/${step.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ step_number: step.step_number + 1 }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Failed to renumber step ${step.id}: ${errorData.error || response.statusText}`);
            }
            
            return response.json();
          })
        );
        
        console.log('[confirmStepNumberChange] PATCH results:', patchResults);
        
        const updatedSteps = localSteps.map(s =>
          s.step_number >= newStepNumber
            ? { ...s, step_number: s.step_number + 1 }
            : s
        );
        setLocalSteps(updatedSteps);
        
        // Step 2: Auto-save the new step at the chosen position
        console.log('[confirmStepNumberChange] Creating new step at position:', newStepNumber);
        const response = await fetch(`/api/v1/recipes/${recipeId}/steps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step_number: newStepNumber,
            title: editingStep.title || null,
            instruction: editingStep.instruction,
            timer_minutes: editingStep.timer_minutes || 0,
            checklist_items: editingStep.checklist_items || [],
            photo_url: editingStep.photo_url || null
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || t('recipes.steps.errorSaving'));
        }

        toast.success(t('recipes.steps.stepAdded'));
        setEditingStep(null);
        setChecklistInput('');
        onStepsChange?.();
        setLoading(false);
        return;
      }
      
      // For EXISTING steps (with id): complex renumbering logic
      if (oldStepNumber === undefined) {
        setLoading(false);
        return;
      }
      
      // Moving up (e.g., from 5 to 2): steps 2,3,4 become 3,4,5
      if (newStepNumber < oldStepNumber) {
        const stepsToUpdate = localSteps.filter(
          s => s.id && s.id !== editingStep.id && s.step_number >= newStepNumber && s.step_number < oldStepNumber
        );
        
        console.log('[confirmStepNumberChange] Moving up - renumbering:', stepsToUpdate.map(s => `${s.step_number} -> ${s.step_number + 1}`));
        
        await Promise.all(
          stepsToUpdate.map(async (step) => {
            const response = await fetch(`/api/v1/recipes/${recipeId}/steps/${step.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ step_number: step.step_number + 1 }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Failed to renumber step ${step.id}: ${errorData.error || response.statusText}`);
            }
            
            return response.json();
          })
        );
        
        const updatedSteps = localSteps.map(s => {
          if (s.id === editingStep.id) return s;
          if (s.step_number >= newStepNumber && s.step_number < oldStepNumber) {
            return { ...s, step_number: s.step_number + 1 };
          }
          return s;
        });
        setLocalSteps(updatedSteps);
      }
      // Moving down (e.g., from 2 to 5): steps 3,4,5 become 2,3,4
      else {
        const stepsToUpdate = localSteps.filter(
          s => s.id && s.id !== editingStep.id && s.step_number > oldStepNumber && s.step_number <= newStepNumber
        );
        
        console.log('[confirmStepNumberChange] Moving down - renumbering:', stepsToUpdate.map(s => `${s.step_number} -> ${s.step_number - 1}`));
        
        await Promise.all(
          stepsToUpdate.map(async (step) => {
            const response = await fetch(`/api/v1/recipes/${recipeId}/steps/${step.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ step_number: step.step_number - 1 }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Failed to renumber step ${step.id}: ${errorData.error || response.statusText}`);
            }
            
            return response.json();
          })
        );
        
        const updatedSteps = localSteps.map(s => {
          if (s.id === editingStep.id) return s;
          if (s.step_number > oldStepNumber && s.step_number <= newStepNumber) {
            return { ...s, step_number: s.step_number - 1 };
          }
          return s;
        });
        setLocalSteps(updatedSteps);
      }
      
      // Update current step
      setEditingStep({ ...editingStep, step_number: newStepNumber });
      toast.success(t('recipes.steps.positionUpdated'));
    } catch (error) {
      console.error('[confirmStepNumberChange] Error:', error);
      toast.error(error instanceof Error ? error.message : t('recipes.steps.errorChangingPosition'));
      // Refresh data to sync with actual DB state
      onStepsChange?.();
    } finally {
      setLoading(false);
    }
  }

  function cancelStepNumberChange() {
    setShowRenumberDialog(false);
    setPendingStepNumber(null);
  }

  function handleStartEdit(step: RecipeStep) {
    setEditingStep({ ...step });
    setChecklistInput('');
  }

  function handleCancel() {
    setEditingStep(null);
    setChecklistInput('');
  }

  async function handleSave() {
    if (!editingStep?.instruction) {
      toast.error(t('recipes.steps.enterInstructions'));
      return;
    }

    setLoading(true);
    try {
      const endpoint = editingStep.id
        ? `/api/v1/recipes/${recipeId}/steps/${editingStep.id}`
        : `/api/v1/recipes/${recipeId}/steps`;

      const method = editingStep.id ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_number: editingStep.step_number,
          title: editingStep.title || null,
          instruction: editingStep.instruction,
          timer_minutes: editingStep.timer_minutes || 0,
          checklist_items: editingStep.checklist_items || [],
          photo_url: editingStep.photo_url || null
        })
      });

      if (!response.ok) throw new Error(t('recipes.steps.errorSaving'));

      toast.success(editingStep.id ? t('recipes.steps.stepUpdated') : t('recipes.steps.stepAdded'));
      setEditingStep(null);
      setChecklistInput('');
      onStepsChange?.();
    } catch (error) {
      console.error('Error saving step:', error);
      toast.error(t('recipes.steps.errorSaving'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(stepId: string) {
    if (!confirm(t('recipes.steps.deleteConfirm'))) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/steps/${stepId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error(t('recipes.steps.errorDeleting'));

      toast.success(t('recipes.steps.stepDeleted'));
      onStepsChange?.();
    } catch (error) {
      console.error('Error deleting step:', error);
      toast.error(t('recipes.steps.errorDeleting'));
    } finally {
      setLoading(false);
    }
  }

  function handleAddChecklistItem() {
    if (!checklistInput.trim()) return;
    if (!editingStep) return;

    setEditingStep({
      ...editingStep,
      checklist_items: [...(editingStep.checklist_items || []), checklistInput.trim()]
    });
    setChecklistInput('');
  }

  function handleRemoveChecklistItem(index: number) {
    if (!editingStep) return;
    setEditingStep({
      ...editingStep,
      checklist_items: editingStep.checklist_items?.filter((_, i) => i !== index) || []
    });
  }

  // Handle drag end
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = sortedSteps.findIndex((step) => step.id === active.id);
    const newIndex = sortedSteps.findIndex((step) => step.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newSteps = arrayMove(sortedSteps, oldIndex, newIndex);
    
    // Update step_number for all reordered steps
    const updatedSteps = newSteps.map((step, index) => ({
      ...step,
      step_number: index + 1,
    }));

    setLocalSteps(updatedSteps);

    // Update step_number in database for each affected step
    try {
      setLoading(true);
      await Promise.all(
        updatedSteps.map((step) =>
          fetch(`/api/v1/recipes/${recipeId}/steps/${step.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step_number: step.step_number }),
          })
        )
      );
      toast.success(t('recipes.steps.reordered'));
      onStepsChange?.();
    } catch (error) {
      console.error('Error reordering steps:', error);
      toast.error(t('recipes.steps.errorReordering'));
      // Revert on error
      setLocalSteps(localSteps);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('recipes.steps.title')}</CardTitle>
          {!readOnly && (
            <Button onClick={handleStartAdd} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {t('recipes.steps.addStep')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Steps List with drag & drop */}
        {sortedSteps.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedSteps.map((s) => s.id!)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {sortedSteps.map((step, index) => (
                  <div key={step.id}>
                    {/* Se questo step è in modifica, mostra il form inline */}
                    {editingStep?.id === step.id && editingStep ? (
                      <Card className="border-primary">
                        <CardContent className="pt-6 space-y-4">
                          <div>
                            <Label htmlFor="step-position">{t('recipes.steps.stepPosition')}</Label>
                            <Select
                              value={editingStep.step_number?.toString()}
                              onValueChange={(value) => handleStepNumberChange(parseInt(value))}
                              disabled={loading}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('recipes.steps.selectPosition')} />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: sortedSteps.length }, (_, i) => i + 1).map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    Step {num}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="timer_minutes">{t('recipes.steps.timerMinutes')}</Label>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <Input
                                id="timer_minutes"
                                type="number"
                                min={0}
                                value={editingStep.timer_minutes || 0}
                                onChange={e => setEditingStep({ ...editingStep, timer_minutes: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="title">{t('recipes.steps.stepTitle')}</Label>
                            <Input
                              id="title"
                              value={editingStep.title || ''}
                              onChange={e => setEditingStep({ ...editingStep, title: e.target.value })}
                              placeholder={t('recipes.steps.titlePlaceholder')}
                            />
                          </div>

                          <div>
                            <Label htmlFor="instruction">{t('recipes.steps.instruction')} *</Label>
                            <Textarea
                              id="instruction"
                              value={editingStep.instruction || ''}
                              onChange={e => setEditingStep({ ...editingStep, instruction: e.target.value })}
                              placeholder={t('recipes.steps.instructionPlaceholder')}
                              rows={4}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>{t('recipes.steps.photoLabel')}</Label>
                            <StepPhotoUploader
                              recipeId={recipeId}
                              stepId={editingStep.id || 'temp'}
                              currentUrl={editingStep.photo_url || ''}
                              onPhotoUpdate={(url) => setEditingStep({ ...editingStep, photo_url: url })}
                              disabled={readOnly}
                            />
                          </div>

                          <div>
                            <Label className="flex items-center gap-2">
                              <ListChecks className="h-4 w-4" />
                              {t('recipes.steps.checklist')}
                            </Label>
                            <div className="flex gap-2 mt-2">
                              <Input
                                value={checklistInput}
                                onChange={e => setChecklistInput(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddChecklistItem();
                                  }
                                }}
                                placeholder={t('recipes.steps.checklistPlaceholder')}
                                className="text-sm"
                              />
                              <Button type="button" onClick={handleAddChecklistItem} size="sm" variant="secondary">
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            {editingStep.checklist_items && editingStep.checklist_items.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {editingStep.checklist_items.map((item, idx) => (
                                  <Badge key={idx} variant="secondary" className="gap-1 text-xs py-1">
                                    {item}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveChecklistItem(idx)}
                                      className="ml-1 hover:text-destructive"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button onClick={handleSave} disabled={loading} className="gap-2">
                              <Save className="h-4 w-4" />
                              {t('recipes.steps.save')}
                            </Button>
                            <Button variant="outline" onClick={handleCancel} disabled={loading}>
                              {t('recipes.steps.cancel')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <SortableStepItem
                        step={step}
                        readOnly={readOnly}
                        loading={loading}
                        onEdit={handleStartEdit}
                        onDelete={(id) => handleDelete(id)}
                        t={t}
                      />
                    )}

                    {/* New step form inline if step_number matches */}
                    {editingStep && !editingStep.id && editingStep.step_number === step.step_number + 1 && (
                      <Card className="border-primary mt-3 mb-3">
                        <CardContent className="pt-6 space-y-4">
                          <div>
                            <Label htmlFor={`inline-position-${step.step_number}`}>{t('recipes.steps.stepPosition')}</Label>
                            <Select
                              value={editingStep.step_number?.toString()}
                              onValueChange={(value) => handleStepNumberChange(parseInt(value))}
                              disabled={loading}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('recipes.steps.selectPosition')} />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: sortedSteps.length + 1 }, (_, i) => i + 1).map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    Step {num}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor={`inline-timer-${step.step_number}`}>{t('recipes.steps.timerMinutes')}</Label>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <Input
                                id={`inline-timer-${step.step_number}`}
                                type="number"
                                min={0}
                                value={editingStep.timer_minutes || 0}
                                onChange={e => setEditingStep({ ...editingStep, timer_minutes: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`inline-title-${step.step_number}`}>{t('recipes.steps.stepTitle')}</Label>
                            <Input
                              id={`inline-title-${step.step_number}`}
                              value={editingStep.title || ''}
                              onChange={e => setEditingStep({ ...editingStep, title: e.target.value })}
                              placeholder={t('recipes.steps.titlePlaceholder')}
                            />
                          </div>

                          <div>
                            <Label htmlFor={`inline-instruction-${step.step_number}`}>{t('recipes.steps.instruction')} *</Label>
                            <Textarea
                              id={`inline-instruction-${step.step_number}`}
                              value={editingStep.instruction || ''}
                              onChange={e => setEditingStep({ ...editingStep, instruction: e.target.value })}
                              placeholder={t('recipes.steps.instructionPlaceholder')}
                              rows={4}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>{t('recipes.steps.photoLabel')}</Label>
                            <StepPhotoUploader
                              recipeId={recipeId}
                              stepId="temp"
                              currentUrl={editingStep.photo_url || ''}
                              onPhotoUpdate={(url) => setEditingStep({ ...editingStep, photo_url: url })}
                              disabled={readOnly}
                            />
                          </div>

                          <div>
                            <Label className="flex items-center gap-2">
                              <ListChecks className="h-4 w-4" />
                              {t('recipes.steps.checklist')}
                            </Label>
                            <div className="flex gap-2 mt-2">
                              <Input
                                value={checklistInput}
                                onChange={e => setChecklistInput(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddChecklistItem();
                                  }
                                }}
                                placeholder={t('recipes.steps.checklistPlaceholder')}
                                className="text-sm"
                              />
                              <Button type="button" onClick={handleAddChecklistItem} size="sm" variant="secondary">
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            {editingStep.checklist_items && editingStep.checklist_items.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {editingStep.checklist_items.map((item, idx) => (
                                  <Badge key={idx} variant="secondary" className="gap-1 text-xs py-1">
                                    {item}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveChecklistItem(idx)}
                                      className="ml-1 hover:text-destructive"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button onClick={handleSave} disabled={loading} className="gap-2">
                              <Save className="h-4 w-4" />
                              {t('recipes.steps.save')}
                            </Button>
                            <Button variant="outline" onClick={handleCancel} disabled={loading}>
                              {t('recipes.steps.cancel')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Insert button between steps */}
                    {!readOnly && index < sortedSteps.length - 1 && (
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-dashed border-border/50" />
                        </div>
                        <div className="relative flex justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInsertAfter(step.step_number)}
                            disabled={loading}
                            className="bg-background px-2 h-6 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {t('recipes.steps.addStep')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Form for NEW step (no id) - at the bottom only if step_number > sortedSteps.length */}
                {editingStep && !editingStep.id && editingStep.step_number !== undefined && editingStep.step_number > sortedSteps.length && (
                  <Card className="border-primary">
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <Label htmlFor="new-position">{t('recipes.steps.stepPosition')}</Label>
                        <Select
                          value={editingStep.step_number?.toString()}
                          onValueChange={(value) => handleStepNumberChange(parseInt(value))}
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('recipes.steps.selectPosition')} />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: sortedSteps.length + 1 }, (_, i) => i + 1).map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                Step {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="new-timer_minutes">{t('recipes.steps.timerMinutes')}</Label>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="new-timer_minutes"
                            type="number"
                            min={0}
                            value={editingStep.timer_minutes || 0}
                            onChange={e => setEditingStep({ ...editingStep, timer_minutes: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="new-title">{t('recipes.steps.stepTitle')}</Label>
                        <Input
                          id="new-title"
                          value={editingStep.title || ''}
                          onChange={e => setEditingStep({ ...editingStep, title: e.target.value })}
                          placeholder={t('recipes.steps.titlePlaceholder')}
                        />
                      </div>

                      <div>
                        <Label htmlFor="new-instruction">{t('recipes.steps.instruction')} *</Label>
                        <Textarea
                          id="new-instruction"
                          value={editingStep.instruction || ''}
                          onChange={e => setEditingStep({ ...editingStep, instruction: e.target.value })}
                          placeholder={t('recipes.steps.instructionPlaceholder')}
                          rows={4}
                        />
                      </div>

                      {/* Photo Upload */}
                      <div className="space-y-2">
                        <Label>{t('recipes.steps.photoLabel')}</Label>
                        <StepPhotoUploader
                          recipeId={recipeId}
                          stepId="temp"
                          currentUrl={editingStep.photo_url || ''}
                          onPhotoUpdate={(url) => setEditingStep({ ...editingStep, photo_url: url })}
                          disabled={readOnly}
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-2">
                          <ListChecks className="h-4 w-4" />
                          {t('recipes.steps.checklist')}
                        </Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={checklistInput}
                            onChange={e => setChecklistInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddChecklistItem();
                              }
                            }}
                            placeholder={t('recipes.steps.checklistPlaceholder')}
                            className="text-sm"
                          />
                          <Button type="button" onClick={handleAddChecklistItem} size="sm" variant="secondary">
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        {editingStep.checklist_items && editingStep.checklist_items.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {editingStep.checklist_items.map((item, idx) => (
                              <Badge key={idx} variant="secondary" className="gap-1 text-xs py-1">
                                {item}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChecklistItem(idx)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button onClick={handleSave} disabled={loading} className="gap-2">
                          <Save className="h-4 w-4" />
                          {t('recipes.steps.save')}
                        </Button>
                        <Button variant="outline" onClick={handleCancel} disabled={loading}>
                          {t('recipes.steps.cancel')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            {readOnly ? t('recipes.steps.noSteps') : t('recipes.steps.addFirstStep')}
          </p>
        )}

        {/* Add Step Button at Bottom */}
        {!readOnly && sortedSteps.length > 0 && !editingStep && (
          <Button 
            onClick={handleStartAdd}
            variant="outline"
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('recipes.steps.addStep')}
          </Button>
        )}

        {/* AlertDialog for step renumbering confirmation */}
        <AlertDialog open={showRenumberDialog} onOpenChange={setShowRenumberDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {editingStep?.id 
                  ? 'Spostare questo step?' 
                  : 'Inserire nuovo step?'
                }
              </AlertDialogTitle>
              <AlertDialogDescription>
                {editingStep?.id 
                  ? `Vuoi spostare questo step alla posizione ${pendingStepNumber}? Gli altri step verranno rinumerati automaticamente.`
                  : `Vuoi inserire questo nuovo step alla posizione ${pendingStepNumber}? Gli step successivi verranno rinumerati automaticamente.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelStepNumberChange}>
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmStepNumberChange}>
                Conferma
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// Sortable Step Item Component
interface SortableStepItemProps {
  step: RecipeStep;
  readOnly: boolean;
  loading: boolean;
  onEdit: (step: RecipeStep) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
}

function SortableStepItem({ step, readOnly, loading, onEdit, onDelete, t }: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
    >
      {/* Drag handle */}
      {!readOnly && (
        <button
          className="cursor-grab active:cursor-grabbing flex-shrink-0 text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      <div className="flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
          {step.step_number}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            {step.title && <h4 className="font-medium text-sm">{step.title}</h4>}
            <p className="text-sm text-muted-foreground">{step.instruction}</p>
            
            <div className="flex flex-wrap gap-1.5 pt-1">
              {step.timer_minutes && step.timer_minutes > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {step.timer_minutes} {t('recipes.steps.min')}
                </Badge>
              )}
              {step.checklist_items && step.checklist_items.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <ListChecks className="h-3 w-3" />
                  {step.checklist_items.length} {t('recipes.steps.items')}
                </Badge>
              )}
            </div>
          </div>
          
          {step.photo_url && (
            <div className="flex-shrink-0">
              <RecipeStepImage 
                photoUrl={step.photo_url} 
                stepTitle={step.title || `Step ${step.step_number}`}
              />
            </div>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(step)}
            disabled={loading}
          >
            {t('recipes.steps.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(step.id!)}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}
