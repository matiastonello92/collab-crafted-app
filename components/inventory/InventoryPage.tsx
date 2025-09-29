'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { InventoryTable } from './InventoryTable';
import { CreateInventoryModal } from './CreateInventoryModal';
import { TemplateWizard } from './TemplateWizard';
import { AuthDebug } from '@/components/debug/AuthDebug';
import { InventoryPresence } from './InventoryPresence';
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
  template_id?: string;
  creation_mode?: 'template' | 'last' | 'empty';
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateWizard, setShowTemplateWizard] = useState(false);
  const [hasTemplates, setHasTemplates] = useState(false);

  const supabase = useSupabase();
  const { presenceUsers, updatePresence } = useInventoryRealtime(header?.id);

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (header?.id) {
      updatePresence(header.id);
    }
  }, [header?.id]);

  useEffect(() => {
    if (orgId && locationId) {
      console.log('Loading inventory for:', { orgId, locationId, category });
      loadCurrentInventory();
      checkForTemplates();
    }
  }, [orgId, locationId, category]);

  const loadUserProfile = async () => {
    console.log('🔍 loadUserProfile: Starting user profile load');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔍 Auth getUser result:', { user: user?.email, error: userError });
      
      if (!user) {
        console.error('❌ No authenticated user found');
        return;
      }

      console.log('✅ User authenticated:', user.email);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('org_id, default_location_id')
        .eq('id', user.id)
        .single();

      console.log('🔍 Profile query result:', { profile, error: profileError });

      if (profile) {
        console.log('✅ Profile found:', profile);
        setOrgId(profile.org_id);
        setLocationId(profile.default_location_id || '');
        
        const { data: membership, error: membershipError } = await supabase
          .from('memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('org_id', profile.org_id)
          .single();

        console.log('🔍 Membership query result:', { membership, error: membershipError });

        if (membership) {
          console.log('✅ Membership found:', membership);
          setUserRole(membership.role === 'admin' ? 'admin' : 
                     membership.role === 'manager' ? 'manager' : 'base');
        }
      } else {
        console.error('❌ No profile found for user or error:', profileError);
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
  };

  const loadCurrentInventory = async () => {
    if (!orgId || !locationId) {
      console.log('🔍 [LOAD] Missing orgId or locationId:', { orgId, locationId });
      return;
    }

    console.log('🔍 [LOAD] Loading current inventory...', { orgId, locationId, category });
    setLoading(true);
    
    try {
      const url = `/api/v1/inventory/headers?org_id=${orgId}&location_id=${locationId}&category=${category}&status=in_progress&limit=1`;
      console.log('🔍 [LOAD] Fetching from URL:', url);
      
      // Check if we have session cookies
      console.log('🔍 [LOAD] Document cookies:', document.cookie);
      
      const response = await fetch(url, {
        credentials: 'include', // Ensure cookies are sent
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('🔍 [LOAD] Response status:', response.status);
      console.log('🔍 [LOAD] Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('🔍 [LOAD] Raw response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('🔍 [LOAD] Parsed JSON data:', data);
      } catch (parseError) {
        console.error('❌ [LOAD] JSON parse error:', parseError);
        throw new Error('Invalid JSON response');
      }
      
      if (!response.ok) {
        console.error('❌ [LOAD] HTTP error:', response.status, data);
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log('✅ [LOAD] Found inventory header:', data[0]);
        setHeader(data[0]);
      } else {
        console.log('📝 [LOAD] No inventory found, data:', data);
        setHeader(null);
      }
    } catch (error) {
      console.error('❌ [LOAD] Error loading inventory:', error);
      setHeader(null);
    } finally {
      setLoading(false);
    }
  };

  const checkForTemplates = async () => {
    if (!orgId || !locationId) return;
    
    try {
      const response = await fetch(
        `/api/v1/inventory/templates?org_id=${orgId}&location_id=${locationId}&category=${category}&is_active=true`
      );
      if (response.ok) {
        const data = await response.json();
        setHasTemplates(data && data.length > 0);
      }
    } catch (error) {
      console.error('Error checking templates:', error);
    }
  };

  const handleInventoryCreated = async (headerId: string) => {
    console.log('✅ [CREATE] Inventory created successfully with ID:', headerId);
    console.log('🔍 [CREATE] Refreshing inventory list...');
    await loadCurrentInventory();
    console.log('✅ [CREATE] Inventory refresh completed');
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
        setHeader(data);
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
  const canComplete = true;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // No current inventory, show create card
  if (!header) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <AuthDebug />
        {!hasTemplates && canCreateInventory && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800">Nessun template disponibile</CardTitle>
              <CardDescription className="text-orange-700">
                Prima di creare il tuo primo inventario, ti consigliamo di creare un template
                per velocizzare le operazioni future.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowTemplateWizard(true)} variant="outline">
                Crea Template {categoryLabels[category]}
              </Button>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Inventario {categoryLabels[category]}</CardTitle>
            <CardDescription>
              Nessun inventario in corso per questa categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canCreateInventory ? (
              <Button onClick={() => setShowCreateModal(true)}>
                Crea Inventario {categoryLabels[category]}
              </Button>
            ) : (
              <div className="text-muted-foreground">
                Non hai i permessi per creare un inventario
              </div>
            )}
          </CardContent>
        </Card>

        <CreateInventoryModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleInventoryCreated}
          locationId={locationId}
          category={category}
          orgId={orgId}
        />

        <TemplateWizard
          isOpen={showTemplateWizard}
          onClose={() => setShowTemplateWizard(false)}
          onSuccess={() => {
            checkForTemplates();
            setShowTemplateWizard(false);
          }}
          locationId={locationId}
          orgId={orgId}
          preselectedCategory={category}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <AuthDebug />
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
                {header.creation_mode && (
                  <Badge variant="outline">
                    {header.creation_mode === 'template' ? 'Da Template' : 
                     header.creation_mode === 'last' ? 'Da Ultimo' : 'Vuoto'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Iniziato il {new Date(header.started_at).toLocaleDateString('it-IT')}
                {header.approved_at && ` • Approvato il ${new Date(header.approved_at).toLocaleDateString('it-IT')}`}
              </CardDescription>
            </div>
            
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