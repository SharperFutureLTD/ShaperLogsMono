'use client'

import { useState } from 'react';
import { Copy, Check, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

interface GeneratedContentCardProps {
  content: string;
  isGenerating: boolean;
  onSave: () => void;
  onRegenerate: () => void;
}

export function GeneratedContentCard({
  content,
  isGenerating,
  onSave,
  onRegenerate
}: GeneratedContentCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (isGenerating) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-mono text-sm text-muted-foreground">
              Generating content...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {content}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </Button>
        </div>
        <Button size="sm" onClick={onSave} className="gap-1.5">
          <Save className="h-4 w-4" />
          Save
        </Button>
      </CardFooter>
    </Card>
  );
}
