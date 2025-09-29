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
  orgId: string;
  locationId: string;
  category: string;
}

export function AddItemDialog({
  open,
  onClose,
  onSuccess,
  headerId,
  orgId,
  locationId,
  category
}: AddItemDialogProps) {
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
  const categoryOptions = {
    kitchen: ['Carne', 'Pesce', 'Vegetali', 'Latticini', 'Conserve', 'Surgelati'],
    bar: ['Vini', 'Birre', 'Soft Drink', 'Consumabili', 'Altro'],
    cleaning: ['Pulizia', 'Consumabili', 'Manutenzione', 'Altro']
  };

  useEffect(() => {
    if (open) {
      loadCatalogItems();
    }
  }, [open, orgId, locationId, category]);

  const loadCatalogItems = async () => {
    try {
      const response = await fetch(`/api/v1/inventory/catalog?org_id=${orgId}&location_id=${locationId}&category=${category}`);
      if (response.ok) {
        const data = await response.json();
        setCatalogItems(data.items || []);
      }
    } catch (error) {
      console.error('Error loading catalog items:', error);
      toast.error('Errore nel caricamento prodotti');
    }
  };

  const handleAddItem = async () => {
    if (!selectedItem) {
      toast.error('Seleziona un prodotto');
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
        toast.success('Prodotto aggiunto con successo');
        onSuccess();
        resetForm();
        onClose();
      } else {
        toast.error('Errore durante l\'aggiunta del prodotto');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Errore durante l\'aggiunta del prodotto');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newProduct.name.trim() || !newProduct.uom.trim() || !newProduct.default_unit_price || !newProduct.product_category) {
      toast.error('Compila tutti i campi obbligatori (inclusa categoria)');
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
          org_id: orgId,
          category,
          name: newProduct.name.trim(),
          uom: newProduct.uom.trim(),
          default_unit_price: parseFloat(newProduct.default_unit_price),
          product_category: newProduct.product_category
        }),
      });

      if (!createResponse.ok) {
        toast.error('Errore durante la creazione del prodotto');
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
        toast.success('Prodotto creato e aggiunto con successo');
        onSuccess();
        resetForm();
        onClose();
      } else {
        toast.error('Prodotto creato ma errore nell\'aggiunta all\'inventario');
      }
    } catch (error) {
      console.error('Error creating and adding product:', error);
      toast.error('Errore durante l\'operazione');
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
          <DialogTitle>Aggiungi Prodotto all'Inventario</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Prodotto Esistente</TabsTrigger>
            <TabsTrigger value="new">Nuovo Prodotto</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Prodotto</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un prodotto" />
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
              <Label htmlFor="quantity">Quantità</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="add-to-template"
                checked={addToTemplate}
                onCheckedChange={setAddToTemplate}
                disabled
              />
              <Label htmlFor="add-to-template" className="opacity-50">
                Aggiungi anche al template (non disponibile)
              </Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button onClick={handleAddItem} disabled={loading}>
                {loading ? 'Aggiungendo...' : 'Aggiungi'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-category">Categoria Prodotto *</Label>
              <Select
                value={newProduct.product_category}
                onValueChange={(value) => setNewProduct(prev => ({ ...prev, product_category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {(categoryOptions[category as keyof typeof categoryOptions] || []).map((cat: string) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-name">Nome Prodotto *</Label>
              <Input
                id="new-name"
                placeholder="Es. Olio Extra Vergine"
                value={newProduct.name}
                onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-uom">Unità di Misura *</Label>
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
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona unità di misura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kg">Kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="Lt">Lt</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="cl">cl</SelectItem>
                  <SelectItem value="Pce">Pce</SelectItem>
                  <SelectItem value="custom">Altro...</SelectItem>
                </SelectContent>
              </Select>
              {newProduct.showCustomUom && (
                <Input
                  placeholder="Inserisci unità personalizzata"
                  value={newProduct.uom}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, uom: e.target.value }))}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-price">Prezzo Unitario (€) *</Label>
              <Input
                id="new-price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newProduct.default_unit_price}
                onChange={(e) => setNewProduct(prev => ({ ...prev, default_unit_price: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-quantity">Quantità</Label>
              <Input
                id="new-quantity"
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button onClick={handleCreateAndAdd} disabled={loading}>
                {loading ? 'Creando...' : 'Crea e Aggiungi'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}