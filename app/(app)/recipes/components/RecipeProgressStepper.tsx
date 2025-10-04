'use client';

import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepStatus {
  info: boolean;
  ingredients: boolean;
  steps: boolean;
}

interface RecipeProgressStepperProps {
  currentStep: 'info' | 'ingredients' | 'steps';
  completionStatus: StepStatus;
  onStepClick?: (step: 'info' | 'ingredients' | 'steps') => void;
}

const STEPS = [
  { key: 'info' as const, label: 'Informazioni' },
  { key: 'ingredients' as const, label: 'Ingredienti' },
  { key: 'steps' as const, label: 'Preparazione' },
];

export function RecipeProgressStepper({
  currentStep,
  completionStatus,
  onStepClick,
}: RecipeProgressStepperProps) {
  const completedCount = Object.values(completionStatus).filter(Boolean).length;
  const totalSteps = Object.keys(completionStatus).length;
  const progress = (completedCount / totalSteps) * 100;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progresso completamento</span>
          <span className="text-muted-foreground">
            {completedCount}/{totalSteps} sezioni
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((step, index) => {
          const isCompleted = completionStatus[step.key];
          const isCurrent = currentStep === step.key;
          const isClickable = onStepClick !== undefined;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <button
                onClick={() => isClickable && onStepClick(step.key)}
                disabled={!isClickable}
                className={cn(
                  'flex flex-col items-center gap-2 w-full transition-colors',
                  isClickable && 'cursor-pointer hover:opacity-80',
                  !isClickable && 'cursor-default'
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all',
                      isCompleted &&
                        'bg-primary border-primary text-primary-foreground',
                      !isCompleted &&
                        isCurrent &&
                        'border-primary bg-primary/10 text-primary',
                      !isCompleted &&
                        !isCurrent &&
                        'border-muted-foreground/30 text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isCurrent ? (
                      <Circle className="w-4 h-4 fill-current" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>

                  {/* Connector Line */}
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 transition-colors',
                        isCompleted ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'text-xs font-medium text-center transition-colors',
                    isCurrent && 'text-foreground',
                    !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
