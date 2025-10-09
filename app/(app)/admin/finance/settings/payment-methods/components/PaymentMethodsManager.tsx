"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AddMethodDialog } from "./AddMethodDialog";
import { MethodCard } from "./MethodCard";

interface PaymentMethod {
  id: string;
  name: string;
  key: string;
  type: string;
  category: string;
  is_base_method: boolean;
  is_active: boolean;
  sort_order: number;
}

interface Location {
  id: string;
  name: string;
}

interface PaymentMethodsManagerProps {
  orgId: string;
  defaultLocationId: string | null;
  locations: Location[];
}

export function PaymentMethodsManager({ orgId, defaultLocationId, locations }: PaymentMethodsManagerProps) {
  const supabase = useSupabase();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>(defaultLocationId || "");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadMethods = async () => {
    if (!selectedLocation) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("org_id", orgId)
      .eq("location_id", selectedLocation)
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Errore nel caricamento dei metodi");
      console.error(error);
    } else {
      setMethods(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMethods();
  }, [selectedLocation, orgId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = methods.findIndex(m => m.id === active.id);
    const newIndex = methods.findIndex(m => m.id === over.id);

    const newOrder = arrayMove(methods, oldIndex, newIndex);
    setMethods(newOrder);

    // Update sort_order in database
    const updates = newOrder.map((method, index) => ({
      id: method.id,
      sort_order: index + 1,
    }));

    for (const update of updates) {
      await supabase
        .from("payment_methods")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);
    }

    toast.success("Ordine aggiornato");
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("payment_methods")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Errore nell'aggiornamento");
      console.error(error);
    } else {
      setMethods(methods.map(m => m.id === id ? { ...m, is_active: !currentState } : m));
      toast.success(!currentState ? "Metodo attivato" : "Metodo disattivato");
    }
  };

  const handleDelete = async (id: string, isBaseMethod: boolean) => {
    if (isBaseMethod) {
      toast.error("Non puoi eliminare i metodi di pagamento base");
      return;
    }

    const { error } = await supabase
      .from("payment_methods")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Errore nell'eliminazione");
      console.error(error);
    } else {
      setMethods(methods.filter(m => m.id !== id));
      toast.success("Metodo eliminato");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestione Metodi</CardTitle>
              <CardDescription>
                Riordina, attiva/disattiva o elimina i metodi di pagamento
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi Metodo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Location:</label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Seleziona location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Methods List */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : methods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">Nessun metodo di pagamento configurato</p>
              <p className="text-sm">Clicca su "Aggiungi Metodo" per iniziare</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={methods.map(m => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {methods.map(method => (
                    <MethodCard
                      key={method.id}
                      method={method}
                      onToggleActive={handleToggleActive}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <AddMethodDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        orgId={orgId}
        locationId={selectedLocation}
        onSuccess={loadMethods}
      />
    </>
  );
}