'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ProductSelector } from './ProductSelector';
import { TemplateItemsManager } from './TemplateItemsManager';

interface TemplateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locationId: string;
  orgId: string;
  preselectedCategory?: 'kitchen' | 'bar' | 'cleaning';
}

interface CatalogItem {
  id: string;
  name: string;
  uom: string;
  default_unit_price: number;
  category: string;
}

interface TemplateItem {
  catalog_item_id: string;
  catalog_item: CatalogItem;
  section?: 'pantry' | 'fridge' | 'freezer';
  sort_order: number;
  uom_override?: string;
  unit_price_override?: number;
}

export function TemplateWizard({
  isOpen,
  onClose,
  onSuccess,
  locationId,
  orgId,
  preselectedCategory
}: TemplateWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Basic info
  const [category, setCategory] = useState<'kitchen' | 'bar' | 'cleaning'>(preselectedCategory || 'kitchen');
  const [templateName, setTemplateName] = useState('');
  
  // Step 2: Items
  const [items, setItems] = useState<TemplateItem[]>([]);
  
  // Step 3: Organization
  const [finalItems, setFinalItems] = useState<TemplateItem[]>([]);

  useEffect(() => {
    if (isOpen && preselectedCategory) {
      setCategory(preselectedCategory);
    }
  }, [isOpen, preselectedCategory]);

  const handleNext = () => {
    if (step === 1) {
      if (!templateName.trim()) {
        toast.error('Inserisci un nome per il template');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (items.length === 0) {
        toast.error('Aggiungi almeno un prodotto al template');
        return;
      }
      setFinalItems([...items]);
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSaveTemplate = async () => {
    setLoading(true);
    try {
      const templateData = {
        org_id: orgId,
        location_id: locationId,
        category,
        name: templateName,
        items: finalItems.map((item, index) => ({
          catalog_item_id: item.catalog_item_id,
          section: item.section,
          sort_order: item.sort_order || index,
          uom_override: item.uom_override,
          unit_price_override: item.unit_price_override
        }))
      };

      const response = await fetch('/api/v1/inventory/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (response.ok) {
        toast.success('Template creato con successo');
        onSuccess();
        onClose();
        resetWizard();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Errore durante la creazione del template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Errore durante la creazione del template');
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setTemplateName('');
    setItems([]);
    setFinalItems([]);
  };

  const handleClose = () => {
    onClose();
    resetWizard();
  };

  const categoryLabels = {
    kitchen: 'Cucina',
    bar: 'Bar',
    cleaning: 'Pulizie'
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Crea Template - Passo {step} di 3
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">Cucina</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="cleaning">Pulizie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome Template</Label>
              <Input
                id="name"
                placeholder="Es. Template Standard Cucina"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <ProductSelector
            locationId={locationId}
            category={category}
            selectedItems={items}
            onItemsChange={setItems}
          />
        )}

        {step === 3 && (
          <TemplateItemsManager
            items={finalItems}
            onItemsChange={setFinalItems}
          />
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={step === 1 ? handleClose : handleBack}>
            {step === 1 ? 'Annulla' : 'Indietro'}
          </Button>
          
          {step < 3 ? (
            <Button onClick={handleNext}>Avanti</Button>
          ) : (
            <Button onClick={handleSaveTemplate} disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva Template'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}