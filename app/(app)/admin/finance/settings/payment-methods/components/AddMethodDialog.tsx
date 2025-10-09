"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const supabase = createClient(
  "https://jwchmdivuwgfjrwvgtia.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3Y2htZGl2dXdnZmpyd3ZndGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MTA4NjMsImV4cCI6MjA3MjA4Njg2M30.e_pN2KPqn9ZtNC32vwYNhjK7xzmIgpqOweqEmUIoPbA"
);

const PAYMENT_TYPES = [
  { value: "cash", label: "Contanti" },
  { value: "card", label: "Carta" },
  { value: "digital", label: "Digitale" },
  { value: "bank_transfer", label: "Bonifico" },
  { value: "customer_credit", label: "Credito Cliente" },
  { value: "other", label: "Altro" },
];

interface AddMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  locationId: string;
  onSuccess: () => void;
}

export function AddMethodDialog({ open, onOpenChange, orgId, locationId, onSuccess }: AddMethodDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("other");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !locationId) {
      toast.error("Compila tutti i campi");
      return;
    }

    setIsLoading(true);

    try {
      // Get current max sort_order
      const { data: maxData } = await supabase
        .from("payment_methods")
        .select("sort_order")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextSortOrder = (maxData?.[0]?.sort_order || 0) + 1;

      // Generate key from name
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

      const { error } = await supabase
        .from("payment_methods")
        .insert({
          org_id: orgId,
          location_id: locationId,
          name: name.trim(),
          key,
          type,
          is_active: true,
          sort_order: nextSortOrder,
        });

      if (error) throw error;

      toast.success("Metodo aggiunto con successo");
      setName("");
      setType("other");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Errore nell'aggiunta del metodo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi Metodo di Pagamento</DialogTitle>
          <DialogDescription>
            Crea un nuovo metodo di pagamento per questa location
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Metodo</Label>
            <Input
              id="name"
              placeholder="es. PayPal, Contrassegno..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Aggiungi"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
