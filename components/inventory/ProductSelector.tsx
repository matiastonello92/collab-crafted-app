'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewProductForm } from './NewProductForm';
import { Search } from 'lucide-react';

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

interface ProductSelectorProps {
  locationId: string;
  orgId: string;
  category: 'kitchen' | 'bar' | 'cleaning';
  selectedItems: TemplateItem[];
  onItemsChange: (items: TemplateItem[]) => void;
}

export function ProductSelector({
  locationId,
  orgId,
  category,
  selectedItems,
  onItemsChange
}: ProductSelectorProps) {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewProductForm, setShowNewProductForm] = useState(false);

  useEffect(() => {
    loadCatalogItems();
  }, [locationId, orgId, category]);

  const loadCatalogItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/inventory/catalog?location_id=${locationId}&org_id=${orgId}&category=${category}`
      );
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and {items: []} response format
        const items = Array.isArray(data) ? data : (data.items || []);
        setCatalogItems(items);
      }
    } catch (error) {
      console.error('Error loading catalog items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = catalogItems.filter(item =>
    (item?.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const selectedItemIds = new Set(selectedItems.map(item => item.catalog_item_id));

  const handleItemToggle = (catalogItem: CatalogItem, checked: boolean) => {
    if (checked) {
      const newItem: TemplateItem = {
        catalog_item_id: catalogItem.id,
        catalog_item: catalogItem,
        sort_order: selectedItems.length
      };
      onItemsChange([...selectedItems, newItem]);
    } else {
      onItemsChange(selectedItems.filter(item => item.catalog_item_id !== catalogItem.id));
    }
  };

  const handleNewProductCreated = (newProduct: CatalogItem) => {
    setCatalogItems([...catalogItems, newProduct]);
    setShowNewProductForm(false);
    
    // Auto-select the new product
    const newItem: TemplateItem = {
      catalog_item_id: newProduct.id,
      catalog_item: newProduct,
      sort_order: selectedItems.length
    };
    onItemsChange([...selectedItems, newItem]);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="catalog">Da Catalogo</TabsTrigger>
          <TabsTrigger value="new">Nuovo Prodotto</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca prodotti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted-foreground">
              Caricamento prodotti...
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {searchTerm ? 'Nessun prodotto trovato' : 'Nessun prodotto disponibile'}
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedItemIds.has(item.id)}
                      onCheckedChange={(checked) => handleItemToggle(item, checked as boolean)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.uom} • €{item.default_unit_price}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedItems.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedItems.length} prodotti selezionati
            </div>
          )}
        </TabsContent>

        <TabsContent value="new">
          <NewProductForm
            locationId={locationId}
            orgId={orgId}
            category={category}
            onProductCreated={handleNewProductCreated}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}