'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  name: string;
  uom: string;
  default_unit_price: number;
  category: 'kitchen' | 'bar' | 'cleaning';
}

interface NewProductFormProps {
  locationId: string;
  orgId: string;
  category: 'kitchen' | 'bar' | 'cleaning';
  onProductCreated: (product: CatalogItem) => void;
}

const categoryOptions = {
  kitchen: ['Carne', 'Pesce', 'Vegetali', 'Latticini', 'Conserve', 'Surgelati'],
  bar: ['Vini', 'Birre', 'Soft Drink', 'Consumabili', 'Altro'],
  cleaning: ['Pulizia', 'Consumabili', 'Manutenzione', 'Altro']
};

export function NewProductForm({
  locationId,
  orgId,
  category,
  onProductCreated
}: NewProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    uom: '',
    default_unit_price: '',
    product_category: '',
    showCustomUom: false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.uom.trim() || !formData.default_unit_price || !formData.product_category) {
      toast.error('Compila tutti i campi obbligatori (inclusa categoria)');
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
          org_id: orgId,
          category,
          name: formData.name.trim(),
          uom: formData.uom.trim(),
          default_unit_price: parseFloat(formData.default_unit_price),
          product_category: formData.product_category
        }),
      });

      if (response.ok) {
        const newProduct = await response.json();
        toast.success('Prodotto creato con successo');
        onProductCreated(newProduct);
        setFormData({ name: '', uom: '', default_unit_price: '', product_category: '', showCustomUom: false });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Errore durante la creazione del prodotto');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Errore durante la creazione del prodotto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome Prodotto *</Label>
        <Input
          id="name"
          placeholder="Es. Olio Extra Vergine"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Categoria Prodotto *</Label>
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
        <Label htmlFor="uom">Unità di Misura *</Label>
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
          <SelectTrigger>
            <SelectValue placeholder="Seleziona unità di misura" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 z-50">
            <SelectItem value="Kg">Kg</SelectItem>
            <SelectItem value="g">g</SelectItem>
            <SelectItem value="Lt">Lt</SelectItem>
            <SelectItem value="ml">ml</SelectItem>
            <SelectItem value="cl">cl</SelectItem>
            <SelectItem value="Pce">Pce</SelectItem>
            <SelectItem value="custom">Altro...</SelectItem>
          </SelectContent>
        </Select>
        {(formData as any).showCustomUom && (
          <Input
            placeholder="Inserisci unità personalizzata"
            value={formData.uom}
            onChange={(e) => setFormData(prev => ({ ...prev, uom: e.target.value }))}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Prezzo Unitario (€) *</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={formData.default_unit_price}
          onChange={(e) => setFormData(prev => ({ ...prev, default_unit_price: e.target.value }))}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creazione...' : 'Crea Prodotto'}
      </Button>
    </form>
  );
}