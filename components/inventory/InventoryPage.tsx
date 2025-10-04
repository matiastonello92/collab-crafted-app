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
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventoryData } from '@/app/(app)/inventory/hooks/useInventoryData';

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
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateWizard, setShowTemplateWizard] = useState(false);
  
  // Pattern di RecipesClient: load user e location dal profile
  const [userId, setUserId] = useState<string | null>(null);
  const [defaultLocationId, setDefaultLocationId] = useState<string>('');

  const supabase = useSupabase();
  
  // Load user and location on mount
  useEffect(() => {
    async function loadUser() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('default_location_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.default_location_id) {
          setDefaultLocationId(profile.default_location_id);
        }
      }
    }
    loadUser();
  }, []);
  
  const { isAdmin, isLoading: permissionsLoading } = usePermissions(defaultLocationId || undefined);
  
  // Use SWR hook for data fetching - aspetta che defaultLocationId sia disponibile
  const { header, hasTemplates, isLoading, mutate } = useInventoryData(
    defaultLocationId || null,
    category,
    inventoryId
  );
  
  const { presenceUsers, updatePresence } = useInventoryRealtime(header?.id);

  useEffect(() => {
    if (header?.id) {
      updatePresence(header.id);
    }
  }, [header?.id, updatePresence]);

  const updateHeaderTotal = useCallback(async () => {
    // Trigger revalidation via SWR
    await mutate();
  }, [mutate]);

  const handleInventoryCreated = async (headerId: string) => {
    // Trigger revalidation via SWR
    await mutate();
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
        await mutate(); // Revalidate via SWR
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

  if (!defaultLocationId || permissionsLoading || isLoading) {
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
            <CardTitle>{t(`inventory.fullTitles.${category}`)}</CardTitle>
            <CardDescription>
              {t('inventory.empty.noInventories')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canCreateInventory ? (
              <Button onClick={() => setShowCreateModal(true)}>
                {t('inventory.buttons.createInventory')}
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
          locationId={defaultLocationId || ''}
          category={category}
        />

        <TemplateWizard
          isOpen={showTemplateWizard}
          onClose={() => setShowTemplateWizard(false)}
          onSuccess={async () => {
            await mutate(); // Revalidate to get updated templates
            setShowTemplateWizard(false);
          }}
          locationId={defaultLocationId || ''}
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
                {t(`inventory.fullTitles.${category}`)}
                <Badge className={`${statusColors[header.status]} text-white`}>
                  {t(`inventory.status.${header.status === 'in_progress' ? 'inProgress' : header.status}`)}
                </Badge>
                {header.creation_mode && (
                  <Badge variant="outline">
                    {t(`inventory.createModesShort.${header.creation_mode}`)}
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
        locationId={defaultLocationId || ''}
        category={category}
        onHeaderUpdate={updateHeaderTotal}
      />
    </div>
  );
}
