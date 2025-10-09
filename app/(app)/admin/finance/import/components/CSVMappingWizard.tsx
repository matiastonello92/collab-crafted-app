"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

interface CSVMappingWizardProps {
  headers: string[];
  sampleData: string[][];
  aiSuggestion: {
    mapping: Record<string, string>;
    confidence: number;
    warnings?: string[];
  };
  onConfirm: (finalMapping: Record<string, string>) => void;
  onCancel: () => void;
  isManualMode?: boolean;
}

const targetFields = [
  { value: "data", label: "📅 Data/Timestamp", required: true },
  { value: "importo", label: "💰 Importo", required: true },
  { value: "metodo_pagamento", label: "💳 Metodo di Pagamento", required: false },
  { value: "note", label: "📝 Note (opzionale)", required: false },
  { value: "_ignore", label: "🚫 Ignora questa colonna", required: false }
];

export function CSVMappingWizard({ 
  headers, 
  sampleData, 
  aiSuggestion,
  onConfirm,
  onCancel,
  isManualMode = false
}: CSVMappingWizardProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(aiSuggestion.mapping);

  const handleMappingChange = (csvColumn: string, targetField: string) => {
    setMapping(prev => ({
      ...prev,
      [csvColumn]: targetField
    }));
  };

  const getMappedPreview = () => {
    return sampleData.slice(0, 5).map((row, rowIdx) => {
      const mappedRow: Record<string, string> = {};
      headers.forEach((header, colIdx) => {
        const targetField = mapping[header];
        if (targetField && targetField !== '_ignore') {
          mappedRow[targetField] = row[colIdx] || '';
        }
      });
      return mappedRow;
    });
  };

  const validateMapping = () => {
    const mappedValues = Object.values(mapping);
    const hasData = mappedValues.includes('data');
    const hasImporto = mappedValues.includes('importo');
    
    return {
      isValid: hasData && hasImporto,
      missingFields: [
        !hasData ? 'data' : null,
        !hasImporto ? 'importo' : null
      ].filter(Boolean) as string[]
    };
  };

  const validation = validateMapping();
  const previewData = getMappedPreview();
  const uniqueMappedFields = Array.from(new Set(Object.values(mapping).filter(v => v !== '_ignore')));

  return (
    <div className="space-y-6">
      {/* Header - AI or Manual */}
      {!isManualMode ? (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">Analisi AI Completata</h3>
                <Badge variant={aiSuggestion.confidence > 0.8 ? "default" : "secondary"}>
                  {(aiSuggestion.confidence * 100).toFixed(0)}% di confidenza
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                L'AI ha analizzato {headers.length} colonne e suggerito un mapping automatico. 
                Puoi rivederlo e modificarlo prima di procedere.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-foreground mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Modalità Import Manuale</h3>
              <p className="text-sm text-muted-foreground">
                Configura manualmente il mapping tra le {headers.length} colonne del CSV e i campi del sistema.
                Seleziona per ogni colonna il campo di destinazione appropriato.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Warnings */}
      {aiSuggestion.warnings && aiSuggestion.warnings.length > 0 && (
        <div className="space-y-2">
          {aiSuggestion.warnings.map((warning, idx) => (
            <Alert key={idx} variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Validation Errors */}
      {!validation.isValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Campi obbligatori mancanti: {validation.missingFields.map(f => `"${f}"`).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Mapping Table */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Configura Mapping Colonne</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Colonna CSV</TableHead>
              <TableHead className="w-1/3">Anteprima Dati</TableHead>
              <TableHead className="w-1/3">Mappa a Campo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headers.map((header, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-mono text-sm">{header}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {sampleData[0]?.[idx] || '-'}
                </TableCell>
                <TableCell>
                  <Select
                    value={mapping[header]}
                    onValueChange={(value) => handleMappingChange(header, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFields.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Preview Section */}
      {validation.isValid && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">Anteprima Dati Mappati (prime 5 righe)</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {uniqueMappedFields.map(field => (
                    <TableHead key={field}>
                      {targetFields.find(f => f.value === field)?.label || field}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, idx) => (
                  <TableRow key={idx}>
                    {uniqueMappedFields.map(field => (
                      <TableCell key={field} className="text-sm">
                        {row[field] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Totale righe da importare: <strong>{sampleData.length}</strong>
          </p>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Annulla
        </Button>
        <Button
          onClick={() => onConfirm(mapping)}
          disabled={!validation.isValid}
          className="flex-1"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Approva e Importa {sampleData.length} Righe
        </Button>
      </div>
    </div>
  );
}
