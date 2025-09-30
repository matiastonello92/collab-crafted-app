'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSupabase } from '@/hooks/useSupabase';

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
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'template' | 'last' | 'empty'>('template');
  const supabase = useSupabase();

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
      console.error('Error loading templates:', error);
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
        toast.success('Inventario creato con successo');
        onSuccess(data.id);
        onClose();
        setNotes('');
      } else {
        toast.error(data.error || 'Errore durante la creazione dell\'inventario');
      }
    } catch (error) {
      console.error('Error creating inventory:', error);
      toast.error('Errore durante la creazione dell\'inventario');
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
          <DialogTitle>Crea Nuovo Inventario</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template" disabled={!hasTemplates}>
              Da Template
            </TabsTrigger>
            <TabsTrigger value="last">Da Ultimo</TabsTrigger>
            <TabsTrigger value="empty" disabled={!canCreateEmpty}>
              Vuoto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4">
            {hasTemplates ? (
              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un template" />
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
                <p>Nessun template disponibile per questa categoria.</p>
                <p className="text-sm">Contatta il tuo Manager per crearne uno.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="last" className="space-y-4">
            <div className="text-center text-muted-foreground py-2">
              <p>L'inventario sarà pre-compilato con le quantità dell'ultimo inventario approvato.</p>
            </div>
          </TabsContent>

          <TabsContent value="empty" className="space-y-4">
            <div className="text-center text-muted-foreground py-2">
              <p>L'inventario sarà creato vuoto. Dovrai aggiungere manualmente tutti i prodotti.</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="notes">Note (opzionali)</Label>
          <Textarea
            id="notes"
            placeholder="Aggiungi note per questo inventario..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button 
            onClick={handleCreateInventory} 
            disabled={loading || (mode === 'template' && !selectedTemplate)}
          >
            {loading ? 'Creazione...' : 'Crea Inventario'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}