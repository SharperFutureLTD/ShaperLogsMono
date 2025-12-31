'use client'

import {
  Code,
  Cog,
  TrendingUp,
  FlaskConical,
  Palette,
  Stethoscope,
  Scale,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface StudyFieldOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const studyFields: StudyFieldOption[] = [
  { id: 'computer_science', label: 'Computer Science', icon: Code },
  { id: 'engineering', label: 'Engineering', icon: Cog },
  { id: 'business', label: 'Business', icon: TrendingUp },
  { id: 'science', label: 'Science', icon: FlaskConical },
  { id: 'arts_humanities', label: 'Arts & Humanities', icon: Palette },
  { id: 'medicine', label: 'Medicine', icon: Stethoscope },
  { id: 'law', label: 'Law', icon: Scale },
  { id: 'other', label: 'Other', icon: BookOpen },
];

export const getStudyFieldLabel = (fieldId: string | null): string => {
  if (!fieldId) return 'Not set';
  const field = studyFields.find((f) => f.id === fieldId);
  if (field) return field.label;
  // If not found in predefined list, it's a custom field
  return fieldId;
};

interface StudyFieldSelectorProps {
  selectedField: string | null;
  onSelect: (field: string) => void;
  disabled?: boolean;
}

export const StudyFieldSelector = ({
  selectedField,
  onSelect,
  disabled = false,
}: StudyFieldSelectorProps) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customField, setCustomField] = useState('');

  const handleSelect = (fieldId: string) => {
    if (fieldId === 'other') {
      setShowCustomInput(true);
      if (customField.trim()) {
        onSelect(customField.trim());
      }
    } else {
      setShowCustomInput(false);
      setCustomField('');
      onSelect(fieldId);
    }
  };

  const handleCustomChange = (value: string) => {
    setCustomField(value);
    if (value.trim()) {
      onSelect(value.trim());
    }
  };

  const isOtherSelected =
    showCustomInput ||
    (selectedField && !studyFields.find((f) => f.id === selectedField));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {studyFields.map((field) => {
          const Icon = field.icon;
          const isSelected =
            field.id === 'other'
              ? isOtherSelected
              : selectedField === field.id;

          return (
            <button
              key={field.id}
              onClick={() => handleSelect(field.id)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200',
                'hover:border-primary/50 hover:bg-accent/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              )}
            >
              <Icon
                className={cn(
                  'h-6 w-6 mb-1.5 transition-colors',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'font-mono text-xs font-medium text-center',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {field.label}
              </span>
            </button>
          );
        })}
      </div>

      {isOtherSelected && (
        <div className="mt-4">
          <Input
            type="text"
            placeholder="Enter your field of study..."
            value={customField}
            onChange={(e) => handleCustomChange(e.target.value)}
            disabled={disabled}
            className="font-mono"
          />
        </div>
      )}
    </div>
  );
};
