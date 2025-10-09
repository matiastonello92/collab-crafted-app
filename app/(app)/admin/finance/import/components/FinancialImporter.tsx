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
import { ImportModeSelector } from "./ImportModeSelector";
import { FileDropzone } from "./FileDropzone";
import { useTranslation } from "@/lib/i18n";

interface FinancialImporterProps {
  orgId: string;
  locationId: string;
  userId: string;
}

export function FinancialImporter({ orgId, locationId, userId }: FinancialImporterProps) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'mode-selection' | 'analyzing' | 'mapping' | 'importing'>('upload');
  const [importMode, setImportMode] = useState<'ai' | 'manual' | null>(null);
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
        toast.error(t('finance.import.messages.onlyCsvSupported'));
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleModeSelection = async (mode: 'ai' | 'manual') => {
    setImportMode(mode);

    if (mode === 'manual') {
      // Manual mode: skip AI and go directly to mapping with empty suggestion
      await loadCSVForManualMapping();
    } else {
      // AI mode: analyze with AI
      await analyzeCSVColumns();
    }
  };

  const loadCSVForManualMapping = async () => {
    if (!file) return;

    try {
      const text = await file.text();
      setCsvContent(text);
      
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const allRows = lines.slice(1).map(l => l.split(',').map(v => v.trim()));

      setCsvHeaders(headers);
      setCsvRows(allRows);

      // Create empty mapping for manual mode
      const emptyMapping: Record<string, string> = {};
      headers.forEach(header => {
        emptyMapping[header] = '_ignore';
      });

      setAiMapping({
        mapping: emptyMapping,
        confidence: 0,
        warnings: []
      });

      setStep('mapping');
    } catch (error) {
      console.error('❌ Error loading CSV:', error);
      toast.error(t('finance.import.messages.errorLoadingCsv'));
      setStep('mode-selection');
    }
  };

  const analyzeCSVColumns = async () => {
    if (!file) {
      toast.error(t('finance.import.messages.selectFile'));
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
      toast.error(t('finance.import.messages.errorAnalyzing'));
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
      toast.success(t('finance.import.messages.importComplete').replace('{count}', data.rowsProcessed));

    } catch (error) {
      console.error(error);
      toast.error(t('finance.import.messages.errorImporting'));
      setStep('upload');
    } finally {
      setProgress(0);
    }
  };

  const cancelMapping = () => {
    setStep('mode-selection');
    setAiMapping(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setProgress(0);
  };

  const proceedToModeSelection = () => {
    if (!file) {
      toast.error(t('finance.import.messages.selectFile'));
      return;
    }
    setStep('mode-selection');
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
      toast.success(t('finance.import.messages.aiAnalysisComplete'));
    } catch (error) {
      console.error(error);
      toast.error(t('finance.import.messages.errorAIAnalysis'));
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      {step === 'upload' && (
        <Card className="p-6">
          <div className="space-y-4">
            <FileDropzone
              onFileSelect={setFile}
              accept=".csv"
              disabled={step !== 'upload'}
              currentFile={file}
            />

            <Button 
              onClick={proceedToModeSelection} 
              disabled={!file}
              className="w-full"
              size="lg"
            >
              <Upload className="w-4 h-4 mr-2" />
              {t('finance.import.continue')}
            </Button>
          </div>
        </Card>
      )}

      {step === 'mode-selection' && (
        <ImportModeSelector 
          onSelectMode={handleModeSelection}
          aiEnabled={true}
        />
      )}

      {step === 'analyzing' && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-lg font-medium">{t('finance.import.analyzing')}</p>
            </div>
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              {t('finance.import.progress.analyzingAI')}
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
          isManualMode={importMode === 'manual'}
        />
      )}

      {step === 'importing' && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-lg font-medium">{t('finance.import.importing')}</p>
            </div>
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              {t('finance.import.importingDesc')}
            </p>
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold">{t('finance.import.results.importComplete')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('finance.import.results.rowsProcessed')}: {result.rowsProcessed} | {t('finance.import.results.errors')}: {result.errors}
              </p>
            </div>
          </div>

          {aiSummary && (
            <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-2">{t('finance.import.results.aiAnalysis')}</h4>
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
            {t('finance.import.smartSystem.title')}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {t('finance.import.smartSystem.description')}
          </p>
          <div className="space-y-2 text-xs">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>{t('finance.import.smartSystem.feature1')}</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>{t('finance.import.smartSystem.feature2')}</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>{t('finance.import.smartSystem.feature3')}</span>
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
            {isAnalyzingAI ? t('finance.import.analyzing') : t('finance.import.analyzeWithAI')}
          </Button>
        </div>
      )}
    </div>
  );
}
