"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Edit3, Zap, Shield } from "lucide-react";

interface ImportModeSelectorProps {
  onSelectMode: (mode: 'ai' | 'manual') => void;
  aiEnabled?: boolean;
}

export function ImportModeSelector({ onSelectMode, aiEnabled = true }: ImportModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Scegli Modalità di Import</h2>
        <p className="text-muted-foreground">
          Seleziona come vuoi importare i tuoi dati finanziari
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
                  ✨ Premium
                </Badge>
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">🤖 Import con AI</h3>
              <p className="text-sm text-muted-foreground mb-4">
                L'intelligenza artificiale analizza automaticamente le tue colonne CSV e suggerisce il mapping migliore.
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span>Veloce e automatico</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>Rileva colonne in qualsiasi lingua</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Suggerimenti intelligenti</span>
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
              Usa AI
            </Button>

            {!aiEnabled && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Disponibile per piani Premium
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
                Gratuito
              </Badge>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">✏️ Import Manuale</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configuri manualmente il mapping tra le colonne del CSV e i campi del sistema.
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-foreground" />
                <span>Controllo totale</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-foreground" />
                <span>Nessun costo aggiuntivo</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-foreground" />
                <span>Perfetto per formati personalizzati</span>
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
              Configura Manualmente
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-muted/50">
        <p className="text-xs text-muted-foreground text-center">
          💡 <strong>Suggerimento:</strong> Prova l'AI per risparmiare tempo, oppure usa la modalità manuale se hai formati CSV molto specifici.
        </p>
      </Card>
    </div>
  );
}
