'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { InventoryTable } from './InventoryTable';
import { InventoryPresence } from './InventoryPresence';
import { AddItemDialog } from './AddItemDialog';
import { useInventoryRealtime } from '@/hooks/useInventoryRealtime';
import { toast } from 'sonner';

interface InventoryPageProps {
  category: 'kitchen' | 'bar' | 'cleaning';
}

type InventoryStatus = 'in_progress' | 'completed' | 'approved';

interface InventoryHeader {
  id: string;
  category: string;
  status: InventoryStatus;
  started_by: string;
  approved_by?: string;
  started_at: string;
  approved_at?: string;
  total_value: number;
  notes?: string;
}

const categoryLabels = {
  kitchen: 'Cucina',
  bar: 'Bar',
  cleaning: 'Pulizie'
};

const statusLabels = {
  in_progress: 'In corso',
  completed: 'Completato',
  approved: 'Approvato'
};

const statusColors = {
  in_progress: 'bg-yellow-500',
  completed: 'bg-blue-500',
  approved: 'bg-green-500'
};

export function InventoryPage({ category }: InventoryPageProps) {
  const [header, setHeader] = useState<InventoryHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<'base' | 'manager' | 'admin'>('base');
  const [orgId, setOrgId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const supabase = useSupabase();

  const { presenceUsers, updatePresence } = useInventoryRealtime(header?.id);

  // Load user profile once on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Load current inventory when org/location are available
  useEffect(() => {
    if (orgId && locationId && !loading) {
      loadCurrentInventory();
    }
  }, [orgId, locationId, category]);

  // Update presence when header is available
  useEffect(() => {
    if (header?.id) {
      updatePresence(header.id);
    }
  }, [header?.id, updatePresence]);

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
        
        // Check user role - simplified for now
        // In a real implementation, you'd check user_roles_locations
        const { data: membership } = await supabase
          .from('memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('org_id', profile.org_id)
          .single();

        if (membership) {
          setUserRole(membership.role === 'admin' ? 'admin' : 
                     membership.role === 'manager' ? 'manager' : 'base');
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadCurrentInventory = async () => {
    if (!orgId || !locationId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/inventory/headers?org_id=${orgId}&location_id=${locationId}&category=${category}&status=in_progress&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.headers && data.headers.length > 0) {
          setHeader(data.headers[0]);
        }
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
        toast.error("Impossibile caricare l'inventario");
    } finally {
      setLoading(false);
    }
  };

  const createNewInventory = async () => {
    if (!locationId) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/v1/inventory/headers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          category,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHeader(data.header);
        toast.success("Nuovo inventario creato");
      } else {
        const error = await response.json();
        toast.error(error.error || "Errore durante la creazione");
      }
    } catch (error) {
      console.error('Error creating inventory:', error);
      toast.error("Errore durante la creazione dell'inventario");
    } finally {
      setSaving(false);
    }
  };

  const updateInventoryStatus = async (newStatus: InventoryStatus) => {
    if (!header) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/inventory/headers?id=${header.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setHeader(data.header);
        toast.success(`Inventario ${statusLabels[newStatus].toLowerCase()}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Errore durante l'aggiornamento");
    } finally {
      setSaving(false);
    }
  };

  const canCreateInventory = userRole === 'admin' || userRole === 'manager';
  const canApprove = userRole === 'admin' || userRole === 'manager';
  const canComplete = true; // All users can mark as completed

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!header) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Inventario {categoryLabels[category]}</CardTitle>
            <CardDescription>
              Nessun inventario in corso per questa categoria.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canCreateInventory && (
              <Button 
                onClick={createNewInventory} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creazione...
                  </>
                ) : (
                  'Inizia Nuovo Inventario'
                )}
              </Button>
            )}
            {!canCreateInventory && (
              <p className="text-muted-foreground text-center">
                Solo i manager e amministratori possono iniziare un nuovo inventario.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Inventario {categoryLabels[category]}
                <Badge className={`${statusColors[header.status]} text-white`}>
                  {statusLabels[header.status]}
                </Badge>
              </CardTitle>
              <CardDescription>
                Iniziato il {new Date(header.started_at).toLocaleDateString('it-IT')}
                {header.approved_at && ` • Approvato il ${new Date(header.approved_at).toLocaleDateString('it-IT')}`}
              </CardDescription>
            </div>
            
            {/* Presence */}
            <InventoryPresence users={presenceUsers} />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">
                €{Number(header.total_value).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                Valore totale
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {header.status === 'in_progress' && canComplete && (
                <Button 
                  variant="outline"
                  onClick={() => updateInventoryStatus('completed')}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Segna Completato
                </Button>
              )}
              
              {header.status === 'completed' && canApprove && (
                <Button 
                  onClick={() => updateInventoryStatus('approved')}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <AlertCircle className="mr-2 h-4 w-4" />
                  )}
                  Approva
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <InventoryTable 
        headerId={header.id}
        canManage={canApprove}
        canEdit={header.status !== 'approved' || canApprove}
        orgId={orgId}
        locationId={locationId}
        category={category}
      />
    </div>
  );
}