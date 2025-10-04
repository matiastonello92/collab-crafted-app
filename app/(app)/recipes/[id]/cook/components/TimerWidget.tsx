'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface TimerWidgetProps {
  minutes: number;
  stepNumber: number;
}

export function TimerWidget({ minutes, stepNumber }: TimerWidgetProps) {
  const { t } = useTranslation();
  const totalSeconds = minutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Reset timer when step changes
    setSecondsRemaining(totalSeconds);
    setIsRunning(false);
    setHasCompleted(false);
  }, [stepNumber, totalSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setHasCompleted(true);
            playAlert();
            toast.success(t('timer.completed'), {
              icon: <Bell className="h-4 w-4" />
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsRemaining]);

  function playAlert() {
    // Create audio element for browser beep
    if (typeof window !== 'undefined') {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGe67Ombk0wMD0+p5O+yZBsCNY3U8c15LAUldsXw3JJBChVhtOjppl8ZC0SU2e+sYhYEMIvN8dB9MAckdcfv3I5CChVet+XtoVsXCkSV2++rYBcFM4nO8NSAMAcfesDu2YxBCRVftOnlnVsYDEKS2e+qZRkFMYnM8dKAMQcfd8Hr2otBChZhtOnmoleWDEGS2u2mYBkEMYnM8d2BMAdceDxh2YpBChZfr+jmnotzDEGT2OmiXhkEMYnN8dR/LwcfesDu2YpBChVftOjknF5zDECU2eyiXRgEMIjN8dSAMAcfesDv3IlBChVer+fknF1zDECT2euiXRgEL4fM8dWAMQcfd8Dv3IlAChRer+jlnF1zDECT2eyiXRcEL4fM8dSAMQcfd8Dv24lAChNer+fknF5zDECT2eyjXhgEL4fM8dSAMQcfd8Dv24lAChNdr+fknF5zC0CT2eyjXxgEMIjM8dSAMQcfd8Dv24lAChNdr+bknF5zC0CT2eyjXxgEMIjM8dOAMQcfd8Dv24hAChJdr+bknF5zC0CT2eyjXxgEMIjM8dOAMQcfd8Dv24hAChJdr+bknF5zC0CT2eyjXxgEL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8dOAMgcfd8Dv24hAChJdr+XknF5zC0CT2eyjXxcFL4fM8c=');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
  }

  function handlePlayPause() {
    setIsRunning(!isRunning);
  }

  function handleReset() {
    setSecondsRemaining(totalSeconds);
    setIsRunning(false);
    setHasCompleted(false);
  }

  const minutesDisplay = Math.floor(secondsRemaining / 60);
  const secondsDisplay = secondsRemaining % 60;
  const progressPercent = ((totalSeconds - secondsRemaining) / totalSeconds) * 100;

  return (
    <Card className={hasCompleted ? 'border-green-500 border-2' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('timer.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-6xl font-mono font-bold tabular-nums">
            {String(minutesDisplay).padStart(2, '0')}
            <span className="text-muted-foreground">:</span>
            {String(secondsDisplay).padStart(2, '0')}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {minutes} {minutes === 1 ? t('timer.minute') : t('timer.minutes')} {t('timer.totalMinutes')}
          </p>
        </div>

        <Progress value={progressPercent} className="h-2" />

        <div className="flex gap-2 justify-center">
          <Button
            onClick={handlePlayPause}
            size="lg"
            className="gap-2 min-w-[120px]"
            disabled={hasCompleted && secondsRemaining === 0}
          >
            {isRunning ? (
              <>
                <Pause className="h-5 w-5" />
                {t('timer.pause')}
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                {t('timer.start')}
              </>
            )}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <RotateCcw className="h-5 w-5" />
            {t('timer.reset')}
          </Button>
        </div>

        {hasCompleted && (
          <div className="text-center text-green-600 font-medium flex items-center justify-center gap-2">
            <Bell className="h-5 w-5" />
            {t('timer.completed')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
