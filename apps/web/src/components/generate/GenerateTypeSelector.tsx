'use client'

import { GenerateType, GenerateTypeOption, getContentTypesForIndustry } from '@/types/generate';
import { cn } from '@/lib/utils';

interface GenerateTypeSelectorProps {
  selectedType: GenerateType;
  industry: string | null;
  employmentStatus: string | null;
  studyField: string | null;
  onSelect: (type: GenerateType, suggestedPrompt: string) => void;
}

export function GenerateTypeSelector({ selectedType, industry, employmentStatus, studyField, onSelect }: GenerateTypeSelectorProps) {
  const contentTypes = getContentTypesForIndustry(industry, employmentStatus, studyField);

  return (
    <div className="space-y-2">
      <label className="font-mono text-xs text-muted-foreground">
        // content type
      </label>
      <div className="flex flex-wrap gap-2">
        {contentTypes.map((option) => (
          <button
            key={option.type}
            onClick={() => onSelect(option.type, option.suggestedPrompt)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              "border",
              selectedType === option.type
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {selectedType !== 'custom' && (
        <p className="text-xs text-muted-foreground">
          {contentTypes.find(o => o.type === selectedType)?.description}
        </p>
      )}
    </div>
  );
}
