'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, X, Clock, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { StepPhotoUploader } from './StepPhotoUploader';
import { RecipeStepImage } from './RecipeStepImage';
import { useTranslation } from '@/lib/i18n';

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
  const [editingStep, setEditingStep] = useState<Partial<RecipeStep> | null>(null);
  const [checklistInput, setChecklistInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number);

  function handleStartAdd() {
    const nextNumber = Math.max(0, ...steps.map(s => s.step_number)) + 1;
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
    if (steps.some(s => s.id !== editingStep.id && s.step_number === editingStep.step_number)) {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('recipes.steps.title')}</CardTitle>
          {!readOnly && !editingStep && (
            <Button onClick={handleStartAdd} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {t('recipes.steps.addStep')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Editing Form */}
        {editingStep && (
          <Card className="border-primary">
            <CardContent className="pt-6 space-y-4">
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

              {/* Photo Upload */}
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
        )}

        {/* Steps List */}
        {sortedSteps.length > 0 ? (
          sortedSteps.map((step) => (
            <div key={step.id} className="flex gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors">
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
                    onClick={() => handleStartEdit(step)}
                    disabled={loading || !!editingStep}
                  >
                    {t('recipes.steps.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => step.id && handleDelete(step.id)}
                    disabled={loading || !!editingStep}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            {readOnly ? t('recipes.steps.noSteps') : t('recipes.steps.addFirstStep')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
