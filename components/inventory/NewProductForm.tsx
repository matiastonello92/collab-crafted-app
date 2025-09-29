'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  name: string;
  uom: string;
  default_unit_price: number;
  category: string;
}

interface NewProductFormProps {
  locationId: string;
  category: string;
  onProductCreated: (product: CatalogItem) => void;
}

export function NewProductForm({
  locationId,
  category,
  onProductCreated
}: NewProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    uom: '',
    default_unit_price: ''
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
          default_unit_price: parseFloat(formData.default_unit_price)
        }),
      });

      if (response.ok) {
        const newProduct = await response.json();
        toast.success('Prodotto creato con successo');
        onProductCreated(newProduct);
        setFormData({ name: '', uom: '', default_unit_price: '' });
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
        <Label htmlFor="uom">Unità di Misura *</Label>
        <Input
          id="uom"
          placeholder="Es. L, Kg, Pz"
          value={formData.uom}
          onChange={(e) => setFormData(prev => ({ ...prev, uom: e.target.value }))}
        />
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