"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

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

export function CSVMappingWizard({ 
  headers, 
  sampleData, 
  aiSuggestion,
  onConfirm,
  onCancel,
  isManualMode = false
}: CSVMappingWizardProps) {
  const { t } = useTranslation();
  const [mapping, setMapping] = useState<Record<string, string>>(aiSuggestion.mapping);

  const targetFields = [
    { value: 'record_date', label: t('finance.import.mapping.fields.recordDate'), required: true },
    { value: 'datetime_from', label: t('finance.import.mapping.fields.datetimeFrom'), required: false },
    { value: 'datetime_to', label: t('finance.import.mapping.fields.datetimeTo'), required: false },
    { value: 'interval_title', label: t('finance.import.mapping.fields.intervalTitle'), required: false },
    { value: 'net_sales_amount', label: t('finance.import.mapping.fields.netSales'), required: false },
    { value: 'gross_sales_amount', label: t('finance.import.mapping.fields.grossSales'), required: false },
    { value: 'total_amount', label: t('finance.import.mapping.fields.totalAmount'), required: true },
    { value: 'covers', label: t('finance.import.mapping.fields.covers'), required: false },
    { value: 'orders', label: t('finance.import.mapping.fields.orders'), required: false },
    { value: 'taxes_amount', label: t('finance.import.mapping.fields.taxes'), required: false },
    { value: 'refunds_amount', label: t('finance.import.mapping.fields.refunds'), required: false },
    { value: 'voids_amount', label: t('finance.import.mapping.fields.voids'), required: false },
    { value: 'discounts_amount', label: t('finance.import.mapping.fields.discounts'), required: false },
    { value: 'complimentary_amount', label: t('finance.import.mapping.fields.complimentary'), required: false },
    { value: 'losses_amount', label: t('finance.import.mapping.fields.losses'), required: false },
    { value: 'tips_amount', label: t('finance.import.mapping.fields.tips'), required: false },
    { value: 'service_charges', label: t('finance.import.mapping.fields.serviceCharges'), required: false },
    { value: '_ignore', label: t('finance.import.mapping.fields.ignore'), required: false }
  ];

  const handleMappingChange = (csvColumn: string, targetField: string) => {
    setMapping(prev => ({
      ...prev,
      [csvColumn]: targetField
    }));
  };

  const getMappedPreview = () => {
    return sampleData.slice(0, 5).map((row) => {
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
    const hasRecordDate = mappedValues.includes('record_date');
    const hasTotalAmount = mappedValues.includes('total_amount');
    
    return {
      isValid: hasRecordDate && hasTotalAmount,
      missingFields: [
        !hasRecordDate ? 'record_date' : null,
        !hasTotalAmount ? 'total_amount' : null,
      ].filter(Boolean) as string[]
    };
  };

  const validation = validateMapping();
  const previewData = getMappedPreview();
  const uniqueMappedFields = Array.from(new Set(Object.values(mapping).filter(v => v !== '_ignore')));

  return (
    <div className="space-y-6">
      {!isManualMode ? (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{t('finance.import.mapping.aiSuggestionTitle')}</h3>
                <Badge variant={aiSuggestion.confidence > 0.8 ? "default" : "secondary"}>
                  {t('finance.import.mapping.confidence')}: {(aiSuggestion.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-foreground mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{t('finance.import.mapping.manualModeTitle')}</h3>
            </div>
          </div>
        </Card>
      )}

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

      {!validation.isValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('finance.import.mapping.validationError')}: {validation.missingFields.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <h3 className="font-semibold mb-4">{t('finance.import.mapping.title')}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">{t('finance.import.mapping.csvColumn')}</TableHead>
              <TableHead className="w-1/3">{t('finance.import.mapping.targetField')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headers.map((header, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-mono text-sm">{header}</TableCell>
                <TableCell>
                  <Select
                    value={mapping[header]}
                    onValueChange={(value) => handleMappingChange(header, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('finance.import.mapping.selectTarget')} />
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

      {validation.isValid && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">{t('finance.import.mapping.previewTitle')}</h3>
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
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          {t('finance.import.mapping.cancel')}
        </Button>
        <Button onClick={() => onConfirm(mapping)} disabled={!validation.isValid} className="flex-1">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {t('finance.import.mapping.confirmImport')}
        </Button>
      </div>
    </div>
  );
}
