'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { TemplateWizard } from '@/components/inventory/TemplateWizard';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store/unified';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from '@/lib/i18n';

interface Template {
  id: string;
  name: string;
  category: 'kitchen' | 'bar' | 'cleaning';
  version: number;
  is_active: boolean;
  created_at: string;
  location_id: string;
  org_id: string;
  inventory_template_items: Array<{
    id: string;
    section: string | null;
    catalog_item: {
      name: string;
    };
  }>;
}

export default function TemplatesPage() {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  
  const { context, hasHydrated } = useAppStore();
  const locationId = context.location_id;
  const { isAdmin } = usePermissions(locationId || undefined);

  const loadTemplates = useCallback(async () => {
    if (!locationId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/inventory/templates?location_id=${locationId}`
      );
      if (response.ok) {
        const data = await response.json();
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error(t('toast.template.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    if (hasHydrated && locationId) {
      loadTemplates();
    }
  }, [hasHydrated, locationId, loadTemplates]);

  const handleToggleActive = async (templateId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/v1/inventory/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentActive
        }),
      });

      if (response.ok) {
        toast.success(t(!currentActive ? 'toast.template.activated' : 'toast.template.deactivated'));
        loadTemplates();
      } else {
        throw new Error('Failed to toggle template');
      }
    } catch (error) {
      toast.error(t('toast.template.errorUpdating'));
    }
  };

  const handleEditTemplate = async (template: Template) => {
    // Load full template details including all item fields
    try {
      const response = await fetch(`/api/v1/inventory/templates/${template.id}`);
      if (response.ok) {
        const fullTemplate = await response.json();
        setEditingTemplate(fullTemplate);
        setShowWizard(true);
      } else {
        toast.error(t('toast.template.errorLoading'));
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error(t('toast.template.errorLoading'));
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo template? Questa azione eliminerà anche tutti gli elementi associati.')) return;

    try {
      const response = await fetch(`/api/v1/inventory/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('toast.template.deleted'));
        loadTemplates();
      } else {
        const error = await response.json();
        toast.error(error.error || t('toast.template.errorDeleting'));
      }
    } catch (error) {
      console.error('Delete template error:', error);
      toast.error(t('toast.template.errorDeleting'));
    }
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setEditingTemplate(null);
  };

  const categoryLabels = {
    kitchen: 'Cucina',
    bar: 'Bar',
    cleaning: 'Pulizie'
  };

  const categoryColors = {
    kitchen: 'bg-orange-100 text-orange-800',
    bar: 'bg-blue-100 text-blue-800',
    cleaning: 'bg-green-100 text-green-800'
  };

  if (!hasHydrated || loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Caricamento template...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestione Template Inventario</h1>
          <p className="text-muted-foreground">
            Crea e gestisci i template per gli inventari delle diverse categorie
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Nessun template disponibile</h3>
            <p className="text-muted-foreground mb-6">
              Crea il tuo primo template per velocizzare la creazione degli inventari
            </p>
            <Button onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crea Primo Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Badge className={categoryColors[template.category]}>
                      {categoryLabels[template.category]}
                    </Badge>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>
                      Versione {template.version} • {template.inventory_template_items?.length || 0} prodotti
                    </CardDescription>
                  </div>
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Attivo' : 'Inattivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {template.inventory_template_items?.slice(0, 3).map((item) => (
                    <div key={item.id} className="text-sm text-muted-foreground">
                      • {item.catalog_item.name}
                      {item.section && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {item.section}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {(template.inventory_template_items?.length || 0) > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{(template.inventory_template_items?.length || 0) - 3} altri prodotti
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Modifica
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(template.id, template.is_active)}
                  >
                    {template.is_active ? 'Disattiva' : 'Attiva'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateWizard
        isOpen={showWizard}
        onClose={handleCloseWizard}
        onSuccess={() => {
          loadTemplates();
          handleCloseWizard();
        }}
        locationId={locationId || ''}
        editingTemplate={editingTemplate || undefined}
      />
    </div>
  );
}