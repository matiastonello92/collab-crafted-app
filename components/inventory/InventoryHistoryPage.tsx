'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Download, Mail, Eye, Edit, Filter, Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSupabase } from '@/hooks/useSupabase';
import { toast } from 'sonner';

interface InventoryHistoryItem {
  id: string;
  category: string;
  status: string;
  started_at: string;
  approved_at: string | null;
  total_value: number;
  started_by_name?: string;
  approved_by_name?: string;
  location_name?: string;
}

const statusLabels = {
  'in_progress': 'In Corso',
  'completed': 'Completato', 
  'approved': 'Approvato'
};

const statusColors = {
  'in_progress': 'bg-yellow-100 text-yellow-800',
  'completed': 'bg-blue-100 text-blue-800',
  'approved': 'bg-green-100 text-green-800'
};

const categoryLabels = {
  'kitchen': 'Cucina',
  'bar': 'Bar',
  'cleaning': 'Pulizie'
};

export function InventoryHistoryPage() {
  const [inventories, setInventories] = useState<InventoryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [orgId, setOrgId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  
  const supabase = useSupabase();

  // Load user profile and inventories
  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (orgId) {
      loadInventories();
    }
  }, [orgId]);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile?.org_id) {
        setOrgId(profile.org_id);
        
        // Check user role
        const { data: membership } = await supabase
          .from('memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('org_id', profile.org_id)
          .single();

        setUserRole(membership?.role || 'user');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Errore nel caricamento del profilo');
    }
  };

  const loadInventories = async () => {
    if (!orgId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_headers')
        .select(`
          *,
          started_by_profile:profiles!started_by(full_name),
          approved_by_profile:profiles!approved_by(full_name),
          location:locations(name)
        `)
        .eq('org_id', orgId)
        .order('started_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        id: item.id,
        category: item.category,
        status: item.status,
        started_at: item.started_at,
        approved_at: item.approved_at,
        total_value: item.total_value || 0,
        started_by_name: item.started_by_profile?.full_name || 'N/A',
        approved_by_name: item.approved_by_profile?.full_name || 'N/A',
        location_name: item.location?.name || 'N/A'
      })) || [];

      setInventories(formattedData);
    } catch (error) {
      console.error('Error loading inventories:', error);
      toast.error('Errore nel caricamento dello storico');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventories = inventories.filter(item => {
    const matchesSearch = !searchTerm || 
      item.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.started_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.approved_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const exportToPDF = (inventoryId: string) => {
    // TODO: Implement PDF export
    toast.info('Export PDF - Coming soon');
  };

  const sendEmail = (inventoryId: string) => {
    // TODO: Implement email functionality  
    toast.info('Invio email - Coming soon');
  };

  const viewDetails = (inventoryId: string) => {
    // TODO: Navigate to detail view
    toast.info('Vista dettaglio - Coming soon');
  };

  const editInventory = (inventoryId: string) => {
    // TODO: Navigate to edit view (only for managers/admins on approved inventories)
    toast.info('Modifica inventario - Coming soon');
  };

  const canEdit = (status: string) => {
    return status === 'approved' && ['admin', 'manager'].includes(userRole);
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Storico Inventari
          </CardTitle>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Cerca per location, utente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="in_progress">In Corso</SelectItem>
                <SelectItem value="completed">Completato</SelectItem>
                <SelectItem value="approved">Approvato</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                <SelectItem value="kitchen">Cucina</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="cleaning">Pulizie</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Caricamento storico inventari...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Inizio</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Valore Totale</TableHead>
                  <TableHead>Iniziato da</TableHead>
                  <TableHead>Approvato da</TableHead>
                  <TableHead>Data Approvazione</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventories.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {format(new Date(item.started_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                    </TableCell>
                    <TableCell>{categoryLabels[item.category as keyof typeof categoryLabels]}</TableCell>
                    <TableCell>{item.location_name}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                        {statusLabels[item.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>€{item.total_value.toFixed(2)}</TableCell>
                    <TableCell>{item.started_by_name}</TableCell>
                    <TableCell>{item.approved_by_name}</TableCell>
                    <TableCell>
                      {item.approved_at 
                        ? format(new Date(item.approved_at), 'dd/MM/yyyy HH:mm', { locale: it })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(item.id)}
                          title="Visualizza dettagli"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportToPDF(item.id)}
                          title="Export PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sendEmail(item.id)}
                          title="Invia per email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        
                        {canEdit(item.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editInventory(item.id)}
                            title="Modifica"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredInventories.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nessun inventario trovato
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}