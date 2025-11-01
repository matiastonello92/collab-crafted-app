'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

  function handleStartAdd() {
    const nextNumber = Math.max(0, ...localSteps.map(s => s.step_number)) + 1;
    setEditingStep({
      step_number: nextNumber,
      instruction: '',
      timer_minutes: 0,
      checklist_items: []
    });
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

    // Check step_number uniqueness
    if (localSteps.some(s => s.id !== editingStep.id && s.step_number === editingStep.step_number)) {
      toast.error(t('recipes.steps.stepNumberExists'));
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
    <>
      <Card>
      <CardHeader>
        <CardTitle>{t('recipes.steps.title')}</CardTitle>
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
                {sortedSteps.map((step) => {
                  // Se questo step è in modifica, mostra il form inline
                  if (editingStep?.id === step.id && editingStep) {
                    const currentStep = editingStep;
                    return (
                      <Card key={step.id} className="border-primary">
                        <CardContent className="pt-6 space-y-4">
                          <div>
                            <Label htmlFor="timer_minutes">{t('recipes.steps.timerMinutes')}</Label>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <Input
                                id="timer_minutes"
                                type="number"
                                min={0}
                                value={currentStep.timer_minutes || 0}
                                onChange={e => setEditingStep({ ...currentStep, timer_minutes: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="title">{t('recipes.steps.stepTitle')}</Label>
                            <Input
                              id="title"
                              value={currentStep.title || ''}
                              onChange={e => setEditingStep({ ...currentStep, title: e.target.value })}
                              placeholder={t('recipes.steps.titlePlaceholder')}
                            />
                          </div>

                          <div>
                            <Label htmlFor="instruction">{t('recipes.steps.instruction')} *</Label>
                            <Textarea
                              id="instruction"
                              value={currentStep.instruction || ''}
                              onChange={e => setEditingStep({ ...currentStep, instruction: e.target.value })}
                              placeholder={t('recipes.steps.instructionPlaceholder')}
                              rows={4}
                            />
                          </div>

                          {/* Photo Upload */}
                          <div className="space-y-2">
                            <Label>{t('recipes.steps.photoLabel')}</Label>
                            <StepPhotoUploader
                              recipeId={recipeId}
                              stepId={currentStep.id || 'temp'}
                              currentUrl={currentStep.photo_url || ''}
                              onPhotoUpdate={(url) => setEditingStep({ ...currentStep, photo_url: url })}
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
                            {currentStep.checklist_items && currentStep.checklist_items.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {currentStep.checklist_items.map((item, idx) => (
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
                    );
                  }
                  
                  // Altrimenti mostra lo step normale
                  return (
                    <SortableStepItem
                      key={step.id}
                      step={step}
                      readOnly={readOnly}
                      loading={loading}
                      onEdit={handleStartEdit}
                      onDelete={(id) => handleDelete(id)}
                      t={t}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            {readOnly ? t('recipes.steps.noSteps') : t('recipes.steps.addFirstStep')}
          </p>
        )}
      </CardContent>
    </Card>
    
    {/* Sticky Fixed Add Button */}
    {!readOnly && !editingStep && (
      <Button 
        onClick={handleStartAdd}
        size="lg"
        className="fixed bottom-6 right-6 z-50 shadow-lg hover:scale-110 transition-transform rounded-full h-14 w-14 p-0"
      >
        <Plus className="h-6 w-6" />
      </Button>
    )}
    </>
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
