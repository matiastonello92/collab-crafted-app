'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { setupKeyboard } from '@/lib/capacitor/native';

interface CatalogItem {
  id: string;
  name: string;
  uom: string;
  default_unit_price: number;
  category: string;
}

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  headerId: string;
  locationId: string;
  category: string;
}

export function AddItemDialog({
  open,
  onClose,
  onSuccess,
  headerId,
  locationId,
  category
}: AddItemDialogProps) {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [addToTemplate, setAddToTemplate] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('existing');
  
  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    uom: '',
    default_unit_price: '',
    product_category: '',
    showCustomUom: false
  });

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

  useEffect(() => {
    if (open) {
      setupKeyboard();
      loadCatalogItems();
    }
  }, [open, locationId, category]);

  const loadCatalogItems = async () => {
    try {
      const response = await fetch(`/api/v1/inventory/catalog?location_id=${locationId}&category=${category}`);
      if (response.ok) {
        const data = await response.json();
        setCatalogItems(data.items || []);
      }
    } catch (error) {
      console.error(t('inventory.toast.errorLoadingProducts'), error);
      toast.error(t('inventory.toast.errorLoadingProducts'));
    }
  };

  const handleAddItem = async () => {
    if (!selectedItem) {
      toast.error(t('inventory.toast.selectProduct'));
      return;
    }

    setLoading(true);
    try {
      const item = catalogItems.find(i => i.id === selectedItem);
      if (!item) return;

      const response = await fetch('/api/v1/inventory/lines/bulk-upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header_id: headerId,
          lines: [{
            catalog_item_id: selectedItem,
            qty: quantity,
            unit_price_snapshot: item.default_unit_price
          }]
        }),
      });

      if (response.ok) {
        toast.success(t('inventory.toast.productAdded'));
        onSuccess();
        resetForm();
        onClose();
      } else {
        toast.error(t('inventory.toast.errorAddingProduct'));
      }
    } catch (error) {
      console.error(t('inventory.toast.errorAddingProduct'), error);
      toast.error(t('inventory.toast.errorAddingProduct'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newProduct.name.trim() || !newProduct.uom.trim() || !newProduct.default_unit_price || !newProduct.product_category) {
      toast.error(t('inventory.toast.allFieldsRequired'));
      return;
    }

    setLoading(true);
    try {
      // Create the new product
      const createResponse = await fetch('/api/v1/inventory/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          category,
          name: newProduct.name.trim(),
          uom: newProduct.uom.trim(),
          default_unit_price: parseFloat(newProduct.default_unit_price),
          product_category: newProduct.product_category
        }),
      });

      if (!createResponse.ok) {
        toast.error(t('inventory.toast.errorCreatingProduct'));
        return;
      }

      const createdProduct = await createResponse.json();
      
      // Add it to the inventory
      const addResponse = await fetch('/api/v1/inventory/lines/bulk-upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header_id: headerId,
          lines: [{
            catalog_item_id: createdProduct.id,
            qty: quantity,
            unit_price_snapshot: parseFloat(newProduct.default_unit_price)
          }]
        }),
      });

      if (addResponse.ok) {
        toast.success(t('inventory.toast.productAdded'));
        onSuccess();
        resetForm();
        onClose();
      } else {
        toast.error(t('inventory.toast.errorAddingProduct'));
      }
    } catch (error) {
      console.error(t('inventory.toast.errorCreatingProduct'), error);
      toast.error(t('inventory.toast.errorCreatingProduct'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedItem('');
    setQuantity(1);
    setAddToTemplate(false);
    setNewProduct({
      name: '',
      uom: '',
      default_unit_price: '',
      product_category: '',
      showCustomUom: false
    });
    setActiveTab('existing');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('inventory.dialogs.addItemTitle')}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">{t('inventory.tabs.existing')}</TabsTrigger>
            <TabsTrigger value="new">{t('inventory.tabs.newProduct')}</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product" className={isMobile ? 'text-base' : ''}>
                {t('inventory.labels.product')}
              </Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className={isMobile ? 'min-h-[44px] text-base' : ''}>
                  <SelectValue placeholder={t('inventory.placeholders.selectProduct')} />
                </SelectTrigger>
                <SelectContent>
                  {catalogItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {item.uom} (€{item.default_unit_price.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className={isMobile ? 'text-base' : ''}>
                {t('inventory.labels.quantity')}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className={isMobile ? 'min-h-[44px] text-base' : ''}
              />
            </div>

            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row justify-end'} gap-2 pt-4`}>
              <Button 
                variant="outline" 
                onClick={onClose}
                className={isMobile ? 'w-full min-h-[44px] order-2' : ''}
              >
                {t('inventory.buttons.cancel')}
              </Button>
              <Button 
                onClick={handleAddItem} 
                disabled={loading}
                className={isMobile ? 'w-full min-h-[44px] order-1' : ''}
              >
                {loading ? t('inventory.loading.saving') : t('inventory.buttons.add')}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-category" className={isMobile ? 'text-base' : ''}>
                {t('inventory.labels.category')} *
              </Label>
              <Select
                value={newProduct.product_category}
                onValueChange={(value) => setNewProduct(prev => ({ ...prev, product_category: value }))}
              >
                <SelectTrigger className={isMobile ? 'min-h-[44px] text-base' : ''}>
                  <SelectValue placeholder={t('inventory.placeholders.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {getCategoryOptions(category).map((cat: string) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-name" className={isMobile ? 'text-base' : ''}>
                {t('inventory.labels.name')} *
              </Label>
              <Input
                id="new-name"
                placeholder={t('inventory.placeholders.enterName')}
                value={newProduct.name}
                onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                className={isMobile ? 'min-h-[44px] text-base' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-uom" className={isMobile ? 'text-base' : ''}>
                {t('inventory.labels.uom')} *
              </Label>
              <Select
                value={newProduct.uom}
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setNewProduct(prev => ({ ...prev, uom: '', showCustomUom: true }));
                  } else {
                    setNewProduct(prev => ({ ...prev, uom: value, showCustomUom: false }));
                  }
                }}
              >
                <SelectTrigger className={isMobile ? 'min-h-[44px] text-base' : ''}>
                  <SelectValue placeholder={t('inventory.placeholders.selectUom')} />
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
              {newProduct.showCustomUom && (
                <Input
                  placeholder={t('inventory.placeholders.enterCustomUnit')}
                  value={newProduct.uom}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, uom: e.target.value }))}
                  className={isMobile ? 'min-h-[44px] text-base' : ''}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-price" className={isMobile ? 'text-base' : ''}>
                {t('inventory.labels.unitPrice')} (€) *
              </Label>
              <Input
                id="new-price"
                type="number"
                step="0.01"
                placeholder={t('inventory.placeholders.enterPrice')}
                value={newProduct.default_unit_price}
                onChange={(e) => setNewProduct(prev => ({ ...prev, default_unit_price: e.target.value }))}
                className={isMobile ? 'min-h-[44px] text-base' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-quantity" className={isMobile ? 'text-base' : ''}>
                {t('inventory.labels.quantity')}
              </Label>
              <Input
                id="new-quantity"
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className={isMobile ? 'min-h-[44px] text-base' : ''}
              />
            </div>

            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row justify-end'} gap-2 pt-4`}>
              <Button 
                variant="outline" 
                onClick={onClose}
                className={isMobile ? 'w-full min-h-[44px] order-2' : ''}
              >
                {t('inventory.buttons.cancel')}
              </Button>
              <Button 
                onClick={handleCreateAndAdd} 
                disabled={loading}
                className={isMobile ? 'w-full min-h-[44px] order-1' : ''}
              >
                {loading ? t('inventory.loading.creating') : t('inventory.buttons.createAndAdd')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
