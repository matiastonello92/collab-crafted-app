"use client";

import { useState } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { CSVMappingWizard } from "./CSVMappingWizard";

interface FinancialImporterProps {
  orgId: string;
  locationId: string;
  userId: string;
}

export function FinancialImporter({ orgId, locationId, userId }: FinancialImporterProps) {
  const supabase = useSupabase();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'analyzing' | 'mapping' | 'importing'>('upload');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [uploadedImportId, setUploadedImportId] = useState<string | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  
  // CSV data for mapping
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvContent, setCsvContent] = useState<string>('');
  const [aiMapping, setAiMapping] = useState<any>(null);

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

  const analyzeCSVColumns = async () => {
    if (!file) {
      toast.error("Seleziona un file");
      return;
    }

    setStep('analyzing');
    setProgress(10);

    try {
      const text = await file.text();
      setCsvContent(text);
      
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const sampleRows = lines.slice(1, 4).map(l => l.split(',').map(v => v.trim()));
      const allRows = lines.slice(1).map(l => l.split(',').map(v => v.trim()));

      setCsvHeaders(headers);
      setCsvRows(allRows);
      setProgress(30);

      console.log('📊 Calling AI to analyze columns:', { headers, sampleRows });

      const { data, error } = await supabase.functions.invoke('analyze-csv-columns', {
        body: { headers, sampleRows }
      });

      if (error) throw error;

      console.log('✅ AI mapping received:', data);
      setAiMapping(data);
      setProgress(100);
      setStep('mapping');

    } catch (error) {
      console.error('❌ Error analyzing CSV:', error);
      toast.error("Errore durante l'analisi del CSV");
      setStep('upload');
      setProgress(0);
    }
  };

  const processImportWithMapping = async (finalMapping: Record<string, string>) => {
    setStep('importing');
    setProgress(10);

    try {
      const { data: importRecord, error: insertError } = await supabase
        .from("financial_imports")
        .insert({
          org_id: orgId,
          location_id: locationId,
          created_by: userId,
          file_name: file!.name,
          file_size: file!.size,
          status: "processing",
          column_mapping: finalMapping
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setProgress(40);

      const { data, error } = await supabase.functions.invoke("process-financial-import", {
        body: { 
          csvContent,
          importId: importRecord.id,
          orgId,
          locationId,
          columnMapping: finalMapping
        }
      });

      if (error) throw error;

      setProgress(100);
      setResult(data);
      setUploadedImportId(importRecord.id);
      setStep('upload');
      toast.success(`Import completato: ${data.rowsProcessed} righe importate`);

    } catch (error) {
      console.error(error);
      toast.error("Errore durante l'import");
      setStep('upload');
    } finally {
      setProgress(0);
    }
  };

  const cancelMapping = () => {
    setStep('upload');
    setAiMapping(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setProgress(0);
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
      {step === 'upload' && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="max-w-xs mx-auto"
                disabled={step !== 'upload'}
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  File selezionato: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <Button 
              onClick={analyzeCSVColumns} 
              disabled={!file}
              className="w-full"
              size="lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Analizza CSV con AI
            </Button>
          </div>
        </Card>
      )}

      {step === 'analyzing' && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-lg font-medium">Analisi AI in corso...</p>
            </div>
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              L'AI sta analizzando le colonne del tuo CSV per suggerire il mapping migliore
            </p>
          </div>
        </Card>
      )}

      {step === 'mapping' && aiMapping && (
        <CSVMappingWizard
          headers={csvHeaders}
          sampleData={csvRows}
          aiSuggestion={aiMapping}
          onConfirm={processImportWithMapping}
          onCancel={cancelMapping}
        />
      )}

      {step === 'importing' && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-lg font-medium">Import in corso...</p>
            </div>
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Stiamo importando i dati nel sistema
            </p>
          </div>
        </Card>
      )}

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

      {step === 'upload' && !uploadedImportId && (
        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Sistema Intelligente di Import
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Il nostro sistema usa AI per rilevare automaticamente le colonne del tuo CSV, 
            indipendentemente dalla lingua o dal formato. Non serve più un formato specifico!
          </p>
          <div className="space-y-2 text-xs">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>Supporta colonne in italiano, inglese, spagnolo, francese...</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>Rileva automaticamente data, importo, metodo di pagamento</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>Permette di correggere il mapping prima dell'import</span>
            </p>
          </div>
        </Card>
      )}

      {uploadedImportId && (
        <div className="flex gap-2">
          <Button 
            onClick={analyzeWithAI} 
            disabled={isAnalyzingAI}
            variant="secondary"
            className="flex-1"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isAnalyzingAI ? "Analizzando..." : "Analizza con AI"}
          </Button>
        </div>
      )}
    </div>
  );
}
