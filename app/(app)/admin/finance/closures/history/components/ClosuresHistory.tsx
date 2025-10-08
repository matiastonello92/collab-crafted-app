"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Download, Eye, Filter } from "lucide-react";

const supabase = createClient(
  "https://jwchmdivuwgfjrwvgtia.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3Y2htZGl2dXdnZmpyd3ZndGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MTA4NjMsImV4cCI6MjA3MjA4Njg2M30.e_pN2KPqn9ZtNC32vwYNhjK7xzmIgpqOweqEmUIoPbA"
);

interface Location {
  id: string;
  name: string;
}

interface Closure {
  id: string;
  closure_date: string;
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  location_id: string;
}

interface ClosuresHistoryProps {
  orgId: string;
  defaultLocationId: string | null;
  locations: Location[];
}

export function ClosuresHistory({ orgId, defaultLocationId, locations }: ClosuresHistoryProps) {
  const [closures, setClosures] = useState<Closure[]>([]);
  const [filteredClosures, setFilteredClosures] = useState<Closure[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>(defaultLocationId || "all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClosures();
  }, [orgId]);

  useEffect(() => {
    applyFilters();
  }, [closures, selectedLocation, dateFrom, dateTo, statusFilter]);

  const loadClosures = async () => {
    setIsLoading(true);

    let query = supabase
      .from("cash_closures")
      .select("*")
      .eq("org_id", orgId)
      .order("closure_date", { ascending: false });

    const { data, error } = await query;

    if (error) {
      toast.error("Errore nel caricamento storico");
      setIsLoading(false);
      return;
    }

    setClosures(data || []);
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...closures];

    if (selectedLocation !== "all") {
      filtered = filtered.filter(c => c.location_id === selectedLocation);
    }

    if (dateFrom) {
      filtered = filtered.filter(c => c.closure_date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter(c => c.closure_date <= dateTo);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    setFilteredClosures(filtered);
  };

  const exportToCSV = () => {
    if (filteredClosures.length === 0) {
      toast.error("Nessun dato da esportare");
      return;
    }

    const headers = ["Data", "Location", "Importo", "Stato", "Note"];
    const rows = filteredClosures.map(c => [
      c.closure_date,
      locations.find(l => l.id === c.location_id)?.name || "N/A",
      c.total_amount.toFixed(2),
      c.status,
      c.notes || ""
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chiusure_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Export completato");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "outline",
      sent: "default",
      confirmed: "secondary"
    };

    const labels: Record<string, string> = {
      draft: "Bozza",
      sent: "Inviato",
      confirmed: "Confermato"
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Filtri</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data da</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data a</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Stato</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="draft">Bozza</SelectItem>
                <SelectItem value="sent">Inviato</SelectItem>
                <SelectItem value="confirmed">Confermato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-muted-foreground">
            {filteredClosures.length} chiusure trovate
          </p>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Esporta CSV
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Caricamento...</p>
          </Card>
        ) : filteredClosures.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nessuna chiusura trovata</p>
          </Card>
        ) : (
          filteredClosures.map((closure) => (
            <Card key={closure.id} className="p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {new Date(closure.closure_date).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {locations.find(l => l.id === closure.location_id)?.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {getStatusBadge(closure.status)}
                  <p className="text-xl font-bold">
                    €{Number(closure.total_amount).toFixed(2)}
                  </p>
                  <Button variant="ghost" size="icon">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {closure.notes && (
                <p className="text-sm text-muted-foreground mt-3 pl-16">
                  {closure.notes}
                </p>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
