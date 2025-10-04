'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ListChecks } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface ChecklistWidgetProps {
  items: string[];
  recipeId: string;
  stepNumber: number;
}

export function ChecklistWidget({ items, recipeId, stepNumber }: ChecklistWidgetProps) {
  const { t } = useTranslation();
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const storageKey = `cook_mode_${recipeId}_step_${stepNumber}_checklist`;

  useEffect(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setCheckedItems(JSON.parse(saved));
        } catch (err) {
          console.error('Error parsing checklist state:', err);
        }
      }
    }
  }, [storageKey]);

  useEffect(() => {
    // Save to localStorage whenever checkedItems changes
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(checkedItems));
    }
  }, [checkedItems, storageKey]);

  function handleToggle(index: number) {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = (completedCount / items.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Checklist
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            {completedCount} / {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progressPercent} className="h-2" />
        
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => handleToggle(index)}
            >
              <Checkbox
                checked={!!checkedItems[index]}
                onCheckedChange={() => handleToggle(index)}
                className="mt-0.5"
              />
              <label
                className={`flex-1 text-sm cursor-pointer select-none ${
                  checkedItems[index] ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {item}
              </label>
            </div>
          ))}
        </div>

        {completedCount === items.length && items.length > 0 && (
          <div className="text-center text-green-600 font-medium pt-2">
            {t('recipe.checklistCompleted')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
