'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { toast } from 'sonner';
import { EditProductDialog } from './EditProductDialog';
import { NewProductForm } from './NewProductForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CatalogPageProps {
  category: 'kitchen' | 'bar' | 'cleaning';
}

interface CatalogItem {
  id: string;
  name: string;
  uom: string;
  default_unit_price: number;
  category: string;
  product_category?: string;
  is_active: boolean;
  created_at: string;
}

const categoryLabels = {
  kitchen: 'Cucina',
  bar: 'Bar',
  cleaning: 'Pulizie'
};

const categoryOptions = {
  kitchen: ['Carne', 'Pesce', 'Vegetali', 'Latticini', 'Conserve', 'Surgelati'],
  bar: ['Vini', 'Birre', 'Soft Drink', 'Consumabili', 'Altro'],
  cleaning: ['Pulizia', 'Consumabili', 'Manutenzione', 'Altro']
};

export function CatalogPage({ category }: CatalogPageProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [orgId, setOrgId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<CatalogItem | null>(null);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  
  const supabase = useSupabase();

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (orgId && locationId) {
      loadCatalog();
    }
  }, [orgId, locationId, category, showActiveOnly]);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, default_location_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        setOrgId(profile.org_id);
        setLocationId(profile.default_location_id || '');

        const { data: membership } = await supabase
          .from('memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('org_id', profile.org_id)
          .single();

        setUserRole(membership?.role || 'base');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Errore nel caricamento del profilo');
    }
  };

  const loadCatalog = async () => {
    if (!orgId || !locationId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/inventory/catalog?org_id=${orgId}&location_id=${locationId}&category=${category}${showActiveOnly ? '&is_active=true' : ''}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setItems((data.items || []).sort((a: CatalogItem, b: CatalogItem) => 
          a.name.localeCompare(b.name)
        ));
      } else {
        toast.error('Errore nel caricamento del catalogo');
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
      toast.error('Errore nel caricamento del catalogo');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo prodotto? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/inventory/catalog?id=${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Prodotto eliminato');
        loadCatalog();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Errore durante l\'eliminazione');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || 
      item.product_category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const canManage = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catalogo Prodotti - {categoryLabels[category]}</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci tutti i prodotti del reparto {categoryLabels[category].toLowerCase()}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowNewProductDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Prodotto
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome prodotto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {categoryOptions[category].map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showActiveOnly ? 'default' : 'outline'}
              onClick={() => setShowActiveOnly(!showActiveOnly)}
            >
              {showActiveOnly ? 'Solo Attivi' : 'Tutti'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Caricamento catalogo...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun prodotto trovato
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Prodotto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>U.M.</TableHead>
                  <TableHead>Prezzo Unitario</TableHead>
                  <TableHead>Stato</TableHead>
                  {canManage && <TableHead>Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {item.product_category && (
                        <Badge variant="outline">{item.product_category}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell>€{Number(item.default_unit_price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? 'Attivo' : 'Disattivato'}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingProduct(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProduct(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          category={category}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            loadCatalog();
          }}
        />
      )}

      <Dialog open={showNewProductDialog} onOpenChange={setShowNewProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Prodotto - {categoryLabels[category]}</DialogTitle>
          </DialogHeader>
          <NewProductForm
            locationId={locationId}
            orgId={orgId}
            category={category}
            onProductCreated={() => {
              setShowNewProductDialog(false);
              loadCatalog();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
