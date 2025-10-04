'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface CreateInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (headerId: string) => void;
  locationId: string;
  category: 'kitchen' | 'bar' | 'cleaning';
}

interface Template {
  id: string;
  name: string;
  version: number;
  is_active: boolean;
}

export function CreateInventoryModal({
  isOpen,
  onClose,
  onSuccess,
  locationId,
  category
}: CreateInventoryModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'template' | 'last' | 'empty'>('template');

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, locationId, category]);

  const loadTemplates = async () => {
    try {
      const response = await fetch(
        `/api/v1/inventory/templates?location_id=${locationId}&category=${category}&is_active=true`
      );
      if (response.ok) {
        const data = await response.json();
        setTemplates(data || []);
        if (data?.length > 0) {
          setSelectedTemplate(data[0].id);
        }
      }
    } catch (error) {
      console.error(t('inventory.toast.errorLoadingTemplate'), error);
    }
  };

  const handleCreateInventory = async () => {
    setLoading(true);
    try {
      const body = {
        location_id: locationId,
        category,
        mode,
        notes: notes.trim() || undefined,
        ...(mode === 'template' && selectedTemplate ? { template_id: selectedTemplate } : {})
      };

      const response = await fetch('/api/v1/inventory/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t('inventory.toast.inventoryCreated'));
        onSuccess(data.id);
        onClose();
        setNotes('');
      } else {
        toast.error(data.error || t('inventory.toast.errorCreatingInventory'));
      }
    } catch (error) {
      console.error(t('inventory.toast.errorCreatingInventory'), error);
      toast.error(t('inventory.toast.errorCreatingInventory'));
    } finally {
      setLoading(false);
    }
  };

  const canCreateEmpty = true; // TODO: Check user permissions
  const hasTemplates = templates.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('inventory.dialogs.createInventoryTitle')}</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template" disabled={!hasTemplates}>
              {t('inventory.tabs.fromTemplate')}
            </TabsTrigger>
            <TabsTrigger value="last">{t('inventory.tabs.fromLast')}</TabsTrigger>
            <TabsTrigger value="empty" disabled={!canCreateEmpty}>
              {t('inventory.tabs.empty')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4">
            {hasTemplates ? (
              <div className="space-y-2">
                <Label htmlFor="template">{t('inventory.labels.none')}</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventory.placeholders.selectProduct')} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} (v{template.version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <p>{t('inventory.empty.noTemplates')}</p>
                <p className="text-sm">Contatta il tuo Manager per crearne uno.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="last" className="space-y-4">
            <div className="text-center text-muted-foreground py-2">
              <p>{t('inventory.createModes.last')}</p>
            </div>
          </TabsContent>

          <TabsContent value="empty" className="space-y-4">
            <div className="text-center text-muted-foreground py-2">
              <p>{t('inventory.createModes.empty')}</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="notes">{t('inventory.labels.notes')}</Label>
          <Textarea
            id="notes"
            placeholder={t('inventory.placeholders.enterNotes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            {t('inventory.buttons.cancel')}
          </Button>
          <Button 
            onClick={handleCreateInventory} 
            disabled={loading || (mode === 'template' && !selectedTemplate)}
          >
            {loading ? t('inventory.loading.creating') : t('inventory.buttons.createInventory')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
