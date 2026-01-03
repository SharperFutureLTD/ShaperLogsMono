'use client'

import { useState, useRef } from "react";
import { Upload, FileText, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTargetDocuments } from "@/hooks/useTargetDocuments";
import { useTargets } from "@/hooks/useTargets";
import type { ExtractedTarget } from "@/types/targets";

interface TargetUploadProps {
  onComplete: () => void;
}

export function TargetUpload({ onComplete }: TargetUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState('targets');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<'select' | 'preview'>('select');
  const [isSaving, setIsSaving] = useState(false);

  const { uploading: isUploading, extracting: isParsing, extractedTargets, uploadDocument, parseAndExtractTargets, clearExtractedTargets } = useTargetDocuments();
  const { createTarget } = useTargets();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    console.log('📤 Starting upload for:', selectedFile.name);
    const doc = await uploadDocument(selectedFile, documentType);
    console.log('📄 Document uploaded:', doc);

    if (doc) {
      console.log('🔍 Extracting targets from:', doc.file_path);
      await parseAndExtractTargets(doc.file_path);
      console.log('📊 Extraction complete, extractedTargets count:', extractedTargets.length);
      console.log('🎯 Setting step to preview');
      setStep('preview');
    } else {
      console.error('❌ Document upload failed');
    }
  };

  const handleSaveTargets = async (targets: ExtractedTarget[]) => {
    console.log('💾 Saving', targets.length, 'targets');
    setIsSaving(true);

    for (const target of targets) {
      console.log('💾 Creating target:', target);
      const success = await createTarget(target);
      console.log('✅ Target created:', success);
    }

    console.log('🧹 Clearing extracted targets');
    clearExtractedTargets();
    setSelectedFile(null);
    setStep('select');
    setIsSaving(false);
    onComplete();
  };

  const handleCancel = () => {
    clearExtractedTargets();
    setSelectedFile(null);
    setStep('select');
  };

  console.log('🔍 TargetUpload render - step:', step, 'extractedTargets:', extractedTargets.length);

  if (step === 'preview' && extractedTargets.length > 0) {
    console.log('✅ Showing preview screen with', extractedTargets.length, 'targets');
    return (
      <div className="border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-sm font-medium text-foreground">
            Extracted Targets ({extractedTargets.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {extractedTargets.map((target, i) => (
            <div key={i} className="p-3 bg-muted/50 rounded-md">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-medium">{target.name}</span>
                <span className="text-xs text-muted-foreground px-2 py-0.5 bg-background rounded">
                  {target.type}
                </span>
              </div>
              {target.description && (
                <p className="text-xs text-muted-foreground">{target.description}</p>
              )}
              {target.target_value && (
                <p className="text-xs text-primary mt-1">
                  Target: {target.unit === 'currency' ? '£' : ''}{target.target_value}
                  {target.unit === 'percentage' ? '%' : ''}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} className="font-mono text-xs">
            [CANCEL]
          </Button>
          <Button
            size="sm"
            onClick={() => handleSaveTargets(extractedTargets)}
            disabled={isSaving}
            className="font-mono text-xs"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            [SAVE ALL]
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-dashed border-border rounded-lg p-6 text-center">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!selectedFile ? (
        <>
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-mono text-sm text-foreground mb-2">
            Upload your targets document
          </p>
          <p className="font-mono text-xs text-muted-foreground mb-4">
            PDF, TXT, or Word documents supported
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="font-mono text-xs"
          >
            [SELECT FILE]
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-foreground">
            <FileText className="h-5 w-5" />
            <span className="font-mono text-sm">{selectedFile.name}</span>
          </div>

          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="w-full max-w-xs mx-auto font-mono text-xs">
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="targets">General Targets</SelectItem>
              <SelectItem value="kpi">KPIs</SelectItem>
              <SelectItem value="ksb">KSBs (Apprenticeship)</SelectItem>
              <SelectItem value="sales_target">Sales Targets</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
              className="font-mono text-xs"
            >
              [CANCEL]
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={isUploading || isParsing}
              className="font-mono text-xs"
            >
              {isUploading || isParsing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {isUploading ? 'Uploading...' : 'Extracting...'}
                </>
              ) : (
                '[EXTRACT TARGETS]'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
