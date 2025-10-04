'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ProductSelector } from './ProductSelector';
import { useTranslation } from '@/lib/i18n';

interface TemplateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locationId: string;
  preselectedCategory?: 'kitchen' | 'bar' | 'cleaning';
  editingTemplate?: {
    id: string;
    name: string;
    category: 'kitchen' | 'bar' | 'cleaning';
    inventory_template_items: Array<{
      id: string;
      catalog_item_id: string;
      sort_order: number;
      uom_override?: string;
      unit_price_override?: number;
      catalog_item: {
        id: string;
        name: string;
        uom: string;
        default_unit_price: number;
        category: 'kitchen' | 'bar' | 'cleaning';
      };
    }>;
  };
}

interface CatalogItem {
  id: string;
  name: string;
  uom: string;
  default_unit_price: number;
  category: 'kitchen' | 'bar' | 'cleaning';
}

interface TemplateItem {
  catalog_item_id: string;
  catalog_item: CatalogItem;
  sort_order: number;
  uom_override?: string;
  unit_price_override?: number;
}

export function TemplateWizard({
  isOpen,
  onClose,
  onSuccess,
  locationId,
  preselectedCategory,
  editingTemplate
}: TemplateWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Basic info
  const [category, setCategory] = useState<'kitchen' | 'bar' | 'cleaning'>(preselectedCategory || 'kitchen');
  const [templateName, setTemplateName] = useState('');
  
  // Step 2: Items
  const [items, setItems] = useState<TemplateItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (editingTemplate) {
        // Load template data for editing
        setCategory(editingTemplate.category);
        setTemplateName(editingTemplate.name);
        setItems(editingTemplate.inventory_template_items.map(item => ({
          catalog_item_id: item.catalog_item_id,
          catalog_item: item.catalog_item,
          sort_order: item.sort_order,
          uom_override: item.uom_override,
          unit_price_override: item.unit_price_override
        })));
        setStep(2); // Go directly to items if editing
      } else if (preselectedCategory) {
        setCategory(preselectedCategory);
      }
    }
  }, [isOpen, preselectedCategory, editingTemplate]);

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error(t('inventory.toast.templateNameRequired'));
      return;
    }
    if (items.length === 0) {
      toast.error(t('inventory.toast.selectAtLeastOneProduct'));
      return;
    }

    setLoading(true);
    try {
      const templateData = {
        location_id: locationId,
        category,
        name: templateName,
        items: items.map((item, index) => ({
          catalog_item_id: item.catalog_item_id,
          sort_order: item.sort_order || index,
          uom_override: item.uom_override,
          unit_price_override: item.unit_price_override
        }))
      };

      const url = editingTemplate 
        ? `/api/v1/inventory/templates/${editingTemplate.id}`
        : '/api/v1/inventory/templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (response.ok) {
        toast.success(editingTemplate ? t('inventory.toast.templateUpdated') : t('inventory.toast.templateCreated'));
        onSuccess();
        onClose();
        resetWizard();
      } else {
        const error = await response.json();
        toast.error(error.error || t('inventory.toast.errorSavingTemplate'));
      }
    } catch (error) {
      console.error(t('inventory.toast.errorSavingTemplate'), error);
      toast.error(t('inventory.toast.errorSavingTemplate'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const resetWizard = () => {
    setStep(1);
    setTemplateName('');
    setItems([]);
  };

  const handleClose = () => {
    onClose();
    resetWizard();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? t('inventory.dialogs.editTemplateTitle') : `${t('inventory.dialogs.createTemplateTitle')} - ${t('common.step')} ${step} ${t('common.of')} 2`}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="category">{t('inventory.labels.category')}</Label>
              <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">{t('inventory.categories.kitchen')}</SelectItem>
                  <SelectItem value="bar">{t('inventory.categories.bar')}</SelectItem>
                  <SelectItem value="cleaning">{t('inventory.categories.cleaning')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('inventory.labels.name')}</Label>
              <Input
                id="name"
                placeholder={t('inventory.placeholders.templateName')}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <ProductSelector
              locationId={locationId}
              category={category}
              selectedItems={items}
              onItemsChange={setItems}
            />
            {items.length > 0 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">{t('inventory.labels.products')}:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.catalog_item_id} className="text-sm flex justify-between">
                      <span>{item.catalog_item.name}</span>
                      <span className="text-muted-foreground">{item.catalog_item.uom} • €{item.catalog_item.default_unit_price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={step === 1 ? handleClose : handleBack}>
            {step === 1 ? t('inventory.buttons.cancel') : t('inventory.buttons.back')}
          </Button>
          
          {step === 1 ? (
            <Button onClick={() => setStep(2)}>{t('inventory.buttons.next')}</Button>
          ) : (
            <Button onClick={handleSaveTemplate} disabled={loading}>
              {loading ? t('inventory.loading.saving') : editingTemplate ? t('inventory.buttons.saveChanges') : t('inventory.buttons.save')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
