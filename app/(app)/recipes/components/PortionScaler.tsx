'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Minus, Plus } from 'lucide-react';
import { calculateScaleFactor, formatQuantity } from '@/lib/recipes/scaling';

interface PortionScalerProps {
  originalServings: number;
  currentServings: number;
  onServingsChange: (servings: number) => void;
  minServings?: number;
  maxServings?: number;
}

export function PortionScaler({
  originalServings,
  currentServings,
  onServingsChange,
  minServings = 1,
  maxServings = 100
}: PortionScalerProps) {
  const scaleFactor = calculateScaleFactor(originalServings, currentServings);
  const isScaled = currentServings !== originalServings;

  const increment = () => {
    if (currentServings < maxServings) {
      onServingsChange(currentServings + 1);
    }
  };

  const decrement = () => {
    if (currentServings > minServings) {
      onServingsChange(currentServings - 1);
    }
  };

  const handleInputChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= minServings && num <= maxServings) {
      onServingsChange(num);
    }
  };

  const reset = () => {
    onServingsChange(originalServings);
  };

  return (
    <Card className="p-4 bg-muted/50">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Prepara per
          </Label>
          {isScaled && (
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              className="h-7 text-xs"
            >
              Ripristina ({originalServings})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={decrement}
            disabled={currentServings <= minServings}
            className="h-9 w-9"
          >
            <Minus className="w-4 h-4" />
          </Button>

          <div className="flex-1">
            <Input
              type="number"
              value={currentServings}
              onChange={(e) => handleInputChange(e.target.value)}
              min={minServings}
              max={maxServings}
              className="text-center h-9"
            />
          </div>

          <Button
            size="icon"
            variant="outline"
            onClick={increment}
            disabled={currentServings >= maxServings}
            className="h-9 w-9"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {isScaled && (
          <div className="text-xs text-center text-muted-foreground">
            Quantità moltiplicate per {formatQuantity(scaleFactor)}x
          </div>
        )}
      </div>
    </Card>
  );
}
