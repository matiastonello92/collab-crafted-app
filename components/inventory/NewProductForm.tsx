'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { setupKeyboard } from '@/lib/capacitor/native';

interface CatalogItem {
  id: string;
  name: string;
  uom: string;
  default_unit_price: number;
  category: 'kitchen' | 'bar' | 'cleaning';
}

interface NewProductFormProps {
  locationId: string;
  category: 'kitchen' | 'bar' | 'cleaning';
  onProductCreated: (product: CatalogItem) => void;
}

export function NewProductForm({
  locationId,
  category,
  onProductCreated
}: NewProductFormProps) {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();
  const [formData, setFormData] = useState({
    name: '',
    uom: '',
    default_unit_price: '',
    product_category: '',
    showCustomUom: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setupKeyboard();
  }, []);

  // Category options per department
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
    
    if (!formData.name.trim() || !formData.uom.trim() || !formData.default_unit_price || !formData.product_category) {
      toast.error(t('inventory.toast.allFieldsRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/inventory/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_id: locationId,
          category,
          name: formData.name.trim(),
          uom: formData.uom.trim(),
          default_unit_price: parseFloat(formData.default_unit_price),
          product_category: formData.product_category
        }),
      });

      if (response.ok) {
        const newProduct = await response.json();
        toast.success(t('inventory.toast.productCreated'));
        onProductCreated(newProduct);
        setFormData({ name: '', uom: '', default_unit_price: '', product_category: '', showCustomUom: false });
      } else {
        const error = await response.json();
        toast.error(error.error || t('inventory.toast.errorCreatingProduct'));
      }
    } catch (error) {
      console.error(t('inventory.toast.errorCreatingProduct'), error);
      toast.error(t('inventory.toast.errorCreatingProduct'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className={isMobile ? 'text-base' : ''}>
          {t('inventory.labels.name')} *
        </Label>
        <Input
          id="name"
          placeholder={t('inventory.placeholders.enterName')}
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className={isMobile ? 'min-h-[44px] text-base' : ''}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category" className={isMobile ? 'text-base' : ''}>
          {t('inventory.labels.category')} *
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
        <Label htmlFor="uom" className={isMobile ? 'text-base' : ''}>
          {t('inventory.labels.uom')} *
        </Label>
        <Select
          value={formData.uom}
          onValueChange={(value) => {
            if (value === 'custom') {
              setFormData(prev => ({ ...prev, uom: '', showCustomUom: true }));
            } else {
              setFormData(prev => ({ ...prev, uom: value, showCustomUom: false }));
            }
          }}
        >
          <SelectTrigger className={isMobile ? 'min-h-[44px] text-base' : ''}>
            <SelectValue placeholder={t('inventory.placeholders.selectUom')} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 z-50">
            <SelectItem value="Kg">Kg</SelectItem>
            <SelectItem value="g">g</SelectItem>
            <SelectItem value="Lt">Lt</SelectItem>
            <SelectItem value="ml">ml</SelectItem>
            <SelectItem value="cl">cl</SelectItem>
            <SelectItem value="Pce">Pce</SelectItem>
            <SelectItem value="custom">{t('inventory.placeholders.customUnit')}</SelectItem>
          </SelectContent>
        </Select>
        {(formData as any).showCustomUom && (
          <Input
            placeholder={t('inventory.placeholders.enterCustomUnit')}
            value={formData.uom}
            onChange={(e) => setFormData(prev => ({ ...prev, uom: e.target.value }))}
            className={isMobile ? 'min-h-[44px] text-base' : ''}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="price" className={isMobile ? 'text-base' : ''}>
          {t('inventory.labels.unitPrice')} (€) *
        </Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          placeholder={t('inventory.placeholders.enterPrice')}
          value={formData.default_unit_price}
          onChange={(e) => setFormData(prev => ({ ...prev, default_unit_price: e.target.value }))}
          className={isMobile ? 'min-h-[44px] text-base' : ''}
        />
      </div>

      <Button 
        type="submit" 
        disabled={loading} 
        className={`w-full ${isMobile ? 'min-h-[48px]' : ''}`}
      >
        {loading ? t('inventory.loading.creating') : t('inventory.buttons.newProduct')}
      </Button>
    </form>
  );
}
