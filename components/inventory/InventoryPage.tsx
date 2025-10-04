'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { useHydratedLocationContext } from '@/lib/store/useHydratedStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';

interface InventoryPageProps {
  category: 'kitchen' | 'bar' | 'cleaning';
  inventoryId?: string;
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

const statusColors = {
  in_progress: 'bg-yellow-500',
  completed: 'bg-blue-500',
  approved: 'bg-green-500'
};

export function InventoryPage({ category, inventoryId }: InventoryPageProps) {
  const { t } = useTranslation();
  const [header, setHeader] = useState<InventoryHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateWizard, setShowTemplateWizard] = useState(false);
  const [hasTemplates, setHasTemplates] = useState(false);

  const supabase = useSupabase();
  
  const { location_id: selectedLocation } = useHydratedLocationContext();
  const locationId = selectedLocation || undefined;
  const { isAdmin, isLoading: permissionsLoading } = usePermissions(locationId);
  
  const { presenceUsers, updatePresence } = useInventoryRealtime(header?.id);

  useEffect(() => {
    if (header?.id) {
      updatePresence(header.id);
    }
  }, [header?.id]);

  const loadSpecificInventory = useCallback(async (id: string) => {
    if (!locationId) {
      console.log('Invalid location ID, skipping specific inventory load');
      return;
    }

    console.log('Loading specific inventory:', id);
    setLoading(true);
    try {
      const url = `/api/v1/inventory/headers?location_id=${locationId}&category=${category}&id=${id}`;
      console.log('Fetching:', url);
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data) && data.length > 0) {
        setHeader(data[0]);
      } else {
        setHeader(null);
        toast.error(t('inventory.empty.noInventories'));
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      setHeader(null);
      toast.error(t('inventory.toast.errorLoadingInventories'));
    } finally {
      setLoading(false);
    }
  }, [locationId, category]);

  const loadCurrentInventory = useCallback(async () => {
    if (!locationId) {
      console.log('Invalid location ID, skipping current inventory load');
      return;
    }

    console.log('Loading current inventory for location:', locationId);
    setLoading(true);
    try {
      const url = `/api/v1/inventory/headers?location_id=${locationId}&category=${category}&status=in_progress`;
      console.log('Fetching:', url);
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data) && data.length > 0) {
        setHeader(data[0]);
      } else {
        setHeader(null);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      setHeader(null);
    } finally {
      setLoading(false);
    }
  }, [locationId, category]);

  const updateHeaderTotal = useCallback(async () => {
    if (!header?.id || !locationId) return;
    
    try {
      const url = `/api/v1/inventory/headers?location_id=${locationId}&category=${category}&id=${header.id}`;
      const response = await fetch(url, { credentials: 'include' });
      
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          setHeader(prev => prev ? { ...prev, total_value: data[0].total_value } : null);
        }
      }
    } catch (error) {
      console.error('Error updating header total:', error);
    }
  }, [header?.id, locationId, category]);

  const checkForTemplates = useCallback(async () => {
    if (!locationId) return;

    try {
      const response = await fetch(
        `/api/v1/inventory/templates?location_id=${locationId}&category=${category}&is_active=true`
      );
      if (response.ok) {
        const data = await response.json();
        setHasTemplates(data && data.length > 0);
      }
    } catch (error) {
      console.error('Error checking templates:', error);
    }
  }, [locationId, category]);

  useEffect(() => {
    if (!selectedLocation) {
      console.log('⏳ [INVENTORY] Waiting for location context...');
      setLoading(false);
      return;
    }

    if (inventoryId) {
      loadSpecificInventory(inventoryId);
    } else {
      loadCurrentInventory();
      checkForTemplates();
    }
  }, [selectedLocation, category, inventoryId, loadSpecificInventory, loadCurrentInventory, checkForTemplates]);

  const handleInventoryCreated = async (headerId: string) => {
    await loadCurrentInventory();
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
        toast.success(`${t('inventory.title')} ${t(`inventory.status.${newStatus === 'in_progress' ? 'inProgress' : newStatus}`).toLowerCase()}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(t('inventory.toast.errorUpdatingProduct'));
    } finally {
      setSaving(false);
    }
  };

  const canCreateInventory = isAdmin;
  const canApprove = isAdmin;
  const canComplete = true;

  if (!selectedLocation || permissionsLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <CardTitle className="text-orange-800">{t('admin.templates.noTemplates')}</CardTitle>
              <CardDescription className="text-orange-700">
                {t('admin.templates.noTemplatesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowTemplateWizard(true)} variant="outline">
                {t('admin.templates.firstTemplate')} {t(`inventory.categories.${category}`)}
              </Button>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>{t('inventory.title')} {t(`inventory.categories.${category}`)}</CardTitle>
            <CardDescription>
              {t('inventory.empty.noInventories')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canCreateInventory ? (
              <Button onClick={() => setShowCreateModal(true)}>
                {t('inventory.buttons.createInventory')} {t(`inventory.categories.${category}`)}
              </Button>
            ) : (
              <div className="text-muted-foreground">
                {t('admin.accessDeniedDesc')}
              </div>
            )}
          </CardContent>
        </Card>

        <CreateInventoryModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleInventoryCreated}
          locationId={locationId || ''}
          category={category}
        />

        <TemplateWizard
          isOpen={showTemplateWizard}
          onClose={() => setShowTemplateWizard(false)}
          onSuccess={() => {
            checkForTemplates();
            setShowTemplateWizard(false);
          }}
          locationId={locationId || ''}
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
                {t('inventory.title')} {t(`inventory.categories.${category}`)}
                <Badge className={`${statusColors[header.status]} text-white`}>
                  {t(`inventory.status.${header.status === 'in_progress' ? 'inProgress' : header.status}`)}
                </Badge>
                {header.creation_mode && (
                  <Badge variant="outline">
                    {t(`inventory.createModes.${header.creation_mode === 'template' ? 'template' : header.creation_mode === 'last' ? 'last' : 'empty'}`).split(' ')[0]}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t('inventory.labels.createdAt')} {new Date(header.started_at).toLocaleDateString('it-IT')}
                {header.approved_at && ` • ${t('inventory.status.approved')} ${new Date(header.approved_at).toLocaleDateString('it-IT')}`}
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
                {t('inventory.labels.totalValue')}
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
                  {t('inventory.buttons.complete')}
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
                  {t('inventory.buttons.approve')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <InventoryTable 
        headerId={header.id}
        canManage={header.status !== 'approved'}
        canEdit={header.status !== 'approved' || canApprove}
        locationId={locationId || ''}
        category={category}
        onHeaderUpdate={updateHeaderTotal}
      />
    </div>
  );
}
