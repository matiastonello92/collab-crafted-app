"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, Sparkles, CheckCircle2 } from "lucide-react";

const supabase = createClient(
  "https://jwchmdivuwgfjrwvgtia.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3Y2htZGl2dXdnZmpyd3ZndGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MTA4NjMsImV4cCI6MjA3MjA4Njg2M30.e_pN2KPqn9ZtNC32vwYNhjK7xzmIgpqOweqEmUIoPbA"
);

interface FinancialImporterProps {
  orgId: string;
  locationId: string;
  userId: string;
}

export function FinancialImporter({ orgId, locationId, userId }: FinancialImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [uploadedImportId, setUploadedImportId] = useState<string | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error("Solo file CSV sono supportati");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const processImport = async () => {
    if (!file) {
      toast.error("Seleziona un file");
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const text = await file.text();
      setProgress(30);

      const { data: importRecord, error: insertError } = await supabase
        .from("financial_imports")
        .insert({
          org_id: orgId,
          location_id: locationId,
          created_by: userId,
          file_name: file.name,
          file_size: file.size,
          status: "processing"
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setProgress(50);

      const { data, error } = await supabase.functions.invoke("process-financial-import", {
        body: { 
          csvContent: text,
          importId: importRecord.id,
          orgId,
          locationId
        }
      });

      if (error) throw error;

      setProgress(100);
      setResult(data);
      setUploadedImportId(importRecord.id);
      toast.success("Import completato con successo");

    } catch (error) {
      console.error(error);
      toast.error("Errore durante l'import");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const analyzeWithAI = async () => {
    if (!uploadedImportId) return;

    setIsAnalyzingAI(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-import-ai", {
        body: { importId: uploadedImportId }
      });

      if (error) throw error;

      setAiSummary(data.summary);
      toast.success("Analisi AI completata");
    } catch (error) {
      console.error(error);
      toast.error("Errore durante l'analisi AI");
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="max-w-xs mx-auto"
              disabled={isProcessing}
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-2">
                File selezionato: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Elaborazione in corso... {progress}%
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={processImport} 
              disabled={!file || isProcessing}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isProcessing ? "Elaborazione..." : "Carica CSV"}
            </Button>
            
            {uploadedImportId && (
              <Button 
                onClick={analyzeWithAI} 
                disabled={isAnalyzingAI}
                variant="secondary"
                className="flex-1"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isAnalyzingAI ? "Analizzando..." : "Analizza con AI"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {result && (
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold">Import Completato</h3>
              <p className="text-sm text-muted-foreground">
                Righe processate: {result.rowsProcessed} | Errori: {result.errors}
              </p>
            </div>
          </div>

          {aiSummary && (
            <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-2">Analisi AI</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {aiSummary}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-2">Formato CSV Richiesto</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Il file deve contenere le seguenti colonne (separatore: virgola):
        </p>
        <code className="text-xs block bg-background p-3 rounded">
          data,importo,metodo_pagamento,note
        </code>
        <p className="text-xs text-muted-foreground mt-2">
          Esempio: 2024-01-15,125.50,Contanti,Vendita mattutina
        </p>
      </Card>
    </div>
  );
}
