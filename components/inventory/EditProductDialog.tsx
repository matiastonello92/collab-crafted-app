'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

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

const categoryOptions = {
  kitchen: ['Carne', 'Pesce', 'Vegetali', 'Latticini', 'Conserve', 'Surgelati'],
  bar: ['Vini', 'Birre', 'Soft Drink', 'Consumabili', 'Altro'],
  cleaning: ['Pulizia', 'Consumabili', 'Manutenzione', 'Altro']
};

export function EditProductDialog({ product, category, onClose, onSuccess }: EditProductDialogProps) {
  const [formData, setFormData] = useState({
    name: product.name,
    uom: product.uom,
    default_unit_price: product.default_unit_price.toString(),
    product_category: product.product_category || '',
    is_active: product.is_active,
    showCustomUom: !['Kg', 'g', 'Lt', 'ml', 'cl', 'Pce'].includes(product.uom)
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.uom.trim() || !formData.default_unit_price) {
      toast.error('Compila tutti i campi obbligatori');
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
        toast.success('Prodotto aggiornato con successo');
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Errore durante l\'aggiornamento del prodotto');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Errore durante l\'aggiornamento del prodotto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica Prodotto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome Prodotto *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category">Categoria Prodotto</Label>
            <Select
              value={formData.product_category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, product_category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions[category].map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-uom">Unità di Misura *</Label>
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
              <SelectTrigger>
                <SelectValue />
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
            {formData.showCustomUom && (
              <Input
                placeholder="Inserisci unità personalizzata"
                value={formData.uom}
                onChange={(e) => setFormData(prev => ({ ...prev, uom: e.target.value }))}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-price">Prezzo Unitario (€) *</Label>
            <Input
              id="edit-price"
              type="number"
              step="0.01"
              value={formData.default_unit_price}
              onChange={(e) => setFormData(prev => ({ ...prev, default_unit_price: e.target.value }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="edit-active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="edit-active">Prodotto attivo</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
