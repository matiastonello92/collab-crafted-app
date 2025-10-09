"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Edit3, Zap, Shield } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface ImportModeSelectorProps {
  onSelectMode: (mode: 'ai' | 'manual') => void;
  aiEnabled?: boolean;
}

export function ImportModeSelector({ onSelectMode, aiEnabled = true }: ImportModeSelectorProps) {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">{t('finance.import.modes.title')}</h2>
        <p className="text-muted-foreground">
          {t('finance.import.modes.description')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* AI Mode Card */}
        <Card 
          className={`p-6 relative transition-all hover:shadow-lg cursor-pointer border-2 ${
            !aiEnabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary'
          }`}
          onClick={() => aiEnabled && onSelectMode('ai')}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              {!aiEnabled && (
                <Badge variant="secondary" className="bg-accent">
                  {t('finance.import.modes.premium')}
                </Badge>
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">{t('finance.import.modes.aiTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('finance.import.modes.aiDescription')}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span>{t('finance.import.modes.fastAutomatic')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>{t('finance.import.modes.detectsLanguage')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>{t('finance.import.modes.smartSuggestions')}</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              disabled={!aiEnabled}
              onClick={(e) => {
                e.stopPropagation();
                if (aiEnabled) onSelectMode('ai');
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('finance.import.modes.useAI')}
            </Button>

            {!aiEnabled && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                {t('finance.import.modes.availableForPremium')}
              </p>
            )}
          </div>
        </Card>

        {/* Manual Mode Card */}
        <Card 
          className="p-6 relative transition-all hover:shadow-lg cursor-pointer border-2 hover:border-primary"
          onClick={() => onSelectMode('manual')}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Edit3 className="w-6 h-6 text-foreground" />
              </div>
              <Badge variant="outline" className="bg-background">
                {t('finance.import.modes.free')}
              </Badge>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">{t('finance.import.modes.manualTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('finance.import.modes.manualDescription')}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-foreground" />
                <span>{t('finance.import.modes.totalControl')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-foreground" />
                <span>{t('finance.import.modes.noCost')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-foreground" />
                <span>{t('finance.import.modes.customFormats')}</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onSelectMode('manual');
              }}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {t('finance.import.modes.configureManually')}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-muted/50">
        <p className="text-xs text-muted-foreground text-center">
          {t('finance.import.modes.tip')}
        </p>
      </Card>
    </div>
  );
}
