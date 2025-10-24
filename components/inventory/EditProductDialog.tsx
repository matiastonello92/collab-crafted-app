'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { setupKeyboard } from '@/lib/capacitor/native';

interface EditProductDialogProps {
  product: {
    id: string;
    name: string;
    uom: string;
    default_unit_price: number;
    product_category?: string;
    is_active: boolean;
  };
  category: 'kitchen' | 'bar' | 'cleaning';
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProductDialog({ product, category, onClose, onSuccess }: EditProductDialogProps) {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();
  const [formData, setFormData] = useState({
    name: product.name,
    uom: product.uom,
    default_unit_price: product.default_unit_price.toString(),
    product_category: product.product_category || '',
    is_active: product.is_active,
    showCustomUom: !['Kg', 'g', 'Lt', 'ml', 'cl', 'Pce'].includes(product.uom)
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setupKeyboard();
  }, []);

  const getCategoryOptions = (cat: string) => {
    if (cat === 'kitchen') return [
      t('inventory.productCategories.kitchen.fresh'),
      t('inventory.productCategories.kitchen.frozen'),
      t('inventory.productCategories.kitchen.dry'),
      t('inventory.productCategories.kitchen.spices'),
      t('inventory.productCategories.kitchen.oils'),
      t('inventory.productCategories.kitchen.other')
    ];
    if (cat === 'bar') return [
      t('inventory.productCategories.bar.spirits'),
      t('inventory.productCategories.bar.wines'),
      t('inventory.productCategories.bar.beers'),
      t('inventory.productCategories.bar.softDrinks'),
      t('inventory.productCategories.bar.mixers'),
      t('inventory.productCategories.bar.garnishes'),
      t('inventory.productCategories.bar.other')
    ];
    return [
      t('inventory.productCategories.cleaning.detergents'),
      t('inventory.productCategories.cleaning.sanitizers'),
      t('inventory.productCategories.cleaning.tools'),
      t('inventory.productCategories.cleaning.disposables'),
      t('inventory.productCategories.cleaning.other')
    ];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.uom.trim() || !formData.default_unit_price) {
      toast.error(t('inventory.toast.allFieldsRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/inventory/catalog?id=${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          uom: formData.uom.trim(),
          default_unit_price: parseFloat(formData.default_unit_price),
          product_category: formData.product_category || null,
          is_active: formData.is_active
        }),
      });

      if (response.ok) {
        toast.success(t('inventory.toast.productUpdated'));
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || t('inventory.toast.errorUpdatingProduct'));
      }
    } catch (error) {
      console.error(t('inventory.toast.errorUpdatingProduct'), error);
      toast.error(t('inventory.toast.errorUpdatingProduct'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('inventory.dialogs.editProductTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name" className={isMobile ? 'text-base' : ''}>
              {t('inventory.labels.name')} *
            </Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={isMobile ? 'min-h-[44px] text-base' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category" className={isMobile ? 'text-base' : ''}>
              {t('inventory.labels.category')}
            </Label>
            <Select
              value={formData.product_category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, product_category: value }))}
            >
              <SelectTrigger className={isMobile ? 'min-h-[44px] text-base' : ''}>
                <SelectValue placeholder={t('inventory.placeholders.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {getCategoryOptions(category).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-uom" className={isMobile ? 'text-base' : ''}>
              {t('inventory.labels.uom')} *
            </Label>
            <Select
              value={formData.showCustomUom ? 'custom' : formData.uom}
              onValueChange={(value) => {
                if (value === 'custom') {
                  setFormData(prev => ({ ...prev, uom: '', showCustomUom: true }));
                } else {
                  setFormData(prev => ({ ...prev, uom: value, showCustomUom: false }));
                }
              }}
            >
              <SelectTrigger className={isMobile ? 'min-h-[44px] text-base' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Kg">Kg</SelectItem>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="Lt">Lt</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="cl">cl</SelectItem>
                <SelectItem value="Pce">Pce</SelectItem>
                <SelectItem value="custom">{t('inventory.placeholders.customUnit')}</SelectItem>
              </SelectContent>
            </Select>
            {formData.showCustomUom && (
              <Input
                placeholder={t('inventory.placeholders.enterCustomUnit')}
                value={formData.uom}
                onChange={(e) => setFormData(prev => ({ ...prev, uom: e.target.value }))}
                className={isMobile ? 'min-h-[44px] text-base' : ''}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-price" className={isMobile ? 'text-base' : ''}>
              {t('inventory.labels.unitPrice')} (€) *
            </Label>
            <Input
              id="edit-price"
              type="number"
              step="0.01"
              value={formData.default_unit_price}
              onChange={(e) => setFormData(prev => ({ ...prev, default_unit_price: e.target.value }))}
              className={isMobile ? 'min-h-[44px] text-base' : ''}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="edit-active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              className={isMobile ? 'scale-110' : ''}
            />
            <Label htmlFor="edit-active" className={isMobile ? 'text-base' : ''}>
              {t('inventory.status.active')}
            </Label>
          </div>

          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row justify-end'} gap-2 pt-4`}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className={isMobile ? 'w-full min-h-[44px] order-2' : ''}
            >
              {t('inventory.buttons.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className={isMobile ? 'w-full min-h-[44px] order-1' : ''}
            >
              {loading ? t('inventory.loading.saving') : t('inventory.buttons.saveChanges')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
