"use client";

import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  currentFile?: File | null;
}

export function FileDropzone({ 
  onFileSelect, 
  accept = ".csv", 
  disabled = false,
  currentFile 
}: FileDropzoneProps) {
  const { t } = useTranslation();
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (!file) return;

    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (accept.includes('csv') && extension !== 'csv') {
      toast.error(t('finance.import.dropzone.onlyCsv'));
      return;
    }

    onFileSelect(file);
  }, [onFileSelect, accept, disabled, t]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <Card 
      className={`border-2 border-dashed p-8 text-center transition-colors ${
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer hover:border-primary hover:bg-accent/50'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => !disabled && document.getElementById('file-input')?.click()}
    >
      <div className="space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          {currentFile ? (
            <FileText className="w-8 h-8 text-primary" />
          ) : (
            <Upload className="w-8 h-8 text-primary" />
          )}
        </div>

        {currentFile ? (
          <div>
            <p className="text-lg font-medium">{currentFile.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(currentFile.size / 1024).toFixed(1)} KB
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('finance.import.dropzone.replaceFile')}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium">
              {t('finance.import.dropzone.dragHere')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('finance.import.dropzone.orClick')}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('finance.import.dropzone.supportedFiles')}
            </p>
          </div>
        )}

        <input
          id="file-input"
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
      </div>
    </Card>
  );
}
