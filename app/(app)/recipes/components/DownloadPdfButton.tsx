"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface DownloadPdfButtonProps {
  recipeId: string;
  defaultServings?: number;
  defaultVariant?: 'full' | 'station';
  isDraft?: boolean;
}

const SERVING_OPTIONS = [2, 4, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];

export function DownloadPdfButton({ 
  recipeId, 
  defaultServings = 4,
  defaultVariant = 'full',
  isDraft = false
}: DownloadPdfButtonProps) {
  const [servings, setServings] = useState(defaultServings.toString());
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = (variant: 'full' | 'station') => {
    try {
      const url = `/api/v1/recipes/${recipeId}/print?servings=${servings}&variant=${variant}&isDraft=${isDraft}`;
      
      // Open print dialog which allows saving as PDF
      const printWindow = window.open(url, '_blank');
      
      setIsOpen(false);
      toast.success(variant === 'full' ? 'Scheda completa pronta per il download' : 'Scheda postazione pronta per il download');
      
      // Log download usage
      fetch(`/api/v1/recipes/${recipeId}/log-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventType: 'recipe_pdf_downloaded',
          metadata: { variant, servings: parseInt(servings) }
        })
      }).catch(err => console.error('Failed to log usage:', err));
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Errore durante la generazione del PDF');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Scarica PDF">
          <Download className="h-4 w-4 mr-2" />
          Scarica PDF
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-3">Scarica Ricetta PDF</h4>
            
            <div className="space-y-2">
              <Label htmlFor="servings-select">Porzioni</Label>
              <Select value={servings} onValueChange={setServings}>
                <SelectTrigger id="servings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVING_OPTIONS.map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} porzioni
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handleDownload('full')}
              className="w-full justify-start"
              variant="default"
            >
              <Download className="h-4 w-4 mr-2" />
              Scheda Completa
              <span className="ml-auto text-xs opacity-70">
                Con foto e note
              </span>
            </Button>
            
            <Button
              onClick={() => handleDownload('station')}
              className="w-full justify-start"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Scheda Postazione
              <span className="ml-auto text-xs opacity-70">
                Solo essenziale
              </span>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Si aprirà la finestra di stampa. Seleziona "Salva come PDF" per scaricare.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
