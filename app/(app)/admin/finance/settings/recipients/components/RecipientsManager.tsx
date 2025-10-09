"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Mail } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface Recipient {
  id: string;
  email: string;
  location_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface RecipientsManagerProps {
  orgId: string;
  locations: Location[];
}

export function RecipientsManager({ orgId, locations }: RecipientsManagerProps) {
  const supabase = useSupabase();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecipients();
  }, [orgId]);

  const loadRecipients = async () => {
    const { data, error } = await supabase
      .from("closure_email_recipients")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Errore nel caricamento destinatari");
      return;
    }

    setRecipients(data || []);
  };

  const addRecipient = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error("Inserisci un'email valida");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from("closure_email_recipients")
      .insert({
        org_id: orgId,
        email: newEmail.toLowerCase(),
        location_id: selectedLocation === "all" ? null : selectedLocation,
        is_active: true
      });

    setIsLoading(false);

    if (error) {
      toast.error("Errore nell'aggiunta destinatario");
      return;
    }

    toast.success("Destinatario aggiunto");
    setNewEmail("");
    setSelectedLocation("all");
    loadRecipients();
  };

  const removeRecipient = async (id: string) => {
    const { error } = await supabase
      .from("closure_email_recipients")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      toast.error("Errore nella rimozione");
      return;
    }

    toast.success("Destinatario rimosso");
    loadRecipients();
  };

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return "Tutte le location";
    return locations.find(l => l.id === locationId)?.name || "Location sconosciuta";
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Aggiungi Destinatario</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="mario.rossi@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le location</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={addRecipient} disabled={isLoading} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Destinatari Attivi</h2>
        <div className="space-y-2">
          {recipients.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nessun destinatario configurato
            </p>
          ) : (
            recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{recipient.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {getLocationName(recipient.location_id)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRecipient(recipient.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
