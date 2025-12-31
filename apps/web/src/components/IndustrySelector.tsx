'use client'

import { useState } from 'react';
import {
  TrendingUp,
  Wrench,
  Code,
  FlaskConical,
  GraduationCap,
  Megaphone,
  DollarSign,
  Heart,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface IndustryOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const industries: IndustryOption[] = [
  { id: 'sales', label: 'Sales', description: 'Account executives, BDRs, sales managers', icon: TrendingUp },
  { id: 'engineering', label: 'Engineering', description: 'Mechanical, electrical, civil', icon: Wrench },
  { id: 'software', label: 'Software Development', description: 'Developers, architects, DevOps', icon: Code },
  { id: 'research', label: 'R&D', description: 'Research scientists, product development', icon: FlaskConical },
  { id: 'education', label: 'Education', description: 'Teachers, professors, trainers', icon: GraduationCap },
  { id: 'marketing', label: 'Marketing', description: 'Digital, brand, content marketing', icon: Megaphone },
  { id: 'finance', label: 'Finance', description: 'Analysts, accountants, advisors', icon: DollarSign },
  { id: 'healthcare', label: 'Healthcare', description: 'Medical professionals, administrators', icon: Heart },
  { id: 'operations', label: 'Operations', description: 'Supply chain, logistics, project management', icon: Settings },
];

export const getIndustryLabel = (industryId: string | null): string => {
  if (!industryId) return 'Not set';
  const found = industries.find(i => i.id === industryId);
  if (found) return found.label;
  // For custom industries, capitalize first letter
  return industryId.charAt(0).toUpperCase() + industryId.slice(1);
};

interface IndustrySelectorProps {
  selectedIndustry: string | null;
  onSelect: (industry: string | null) => void;
  disabled?: boolean;
}

export const IndustrySelector = ({
  selectedIndustry,
  onSelect,
  disabled = false
}: IndustrySelectorProps) => {
  const [showOther, setShowOther] = useState(
    selectedIndustry ? !industries.some(i => i.id === selectedIndustry) : false
  );
  const [customIndustry, setCustomIndustry] = useState(
    selectedIndustry && !industries.some(i => i.id === selectedIndustry)
      ? selectedIndustry
      : ''
  );

  const handleSelect = (industryId: string) => {
    if (industryId === 'other') {
      setShowOther(true);
      onSelect(null);
    } else {
      setShowOther(false);
      setCustomIndustry('');
      onSelect(industryId);
    }
  };

  const handleCustomChange = (value: string) => {
    setCustomIndustry(value);
    if (value.trim()) {
      onSelect(value.trim());
    } else {
      onSelect(null);
    }
  };

  return (
    <div>
      {/* Industry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {industries.map((industry) => {
          const Icon = industry.icon;
          const isSelected = selectedIndustry === industry.id;

          return (
            <button
              key={industry.id}
              onClick={() => handleSelect(industry.id)}
              disabled={disabled}
              className={`
                p-4 rounded-lg border text-left transition-all duration-200
                hover:border-primary/50 hover:bg-muted/50
                focus:outline-none focus:ring-2 focus:ring-primary/50
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
                }
              `}
            >
              <Icon className={`h-5 w-5 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="font-mono text-sm font-medium text-foreground">
                {industry.label}
              </div>
              <div className="font-mono text-xs text-muted-foreground mt-1 line-clamp-2">
                {industry.description}
              </div>
            </button>
          );
        })}

        {/* Other Option */}
        <button
          onClick={() => handleSelect('other')}
          disabled={disabled}
          className={`
            p-4 rounded-lg border text-left transition-all duration-200
            hover:border-primary/50 hover:bg-muted/50
            focus:outline-none focus:ring-2 focus:ring-primary/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${showOther
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card'
            }
          `}
        >
          <MoreHorizontal className={`h-5 w-5 mb-2 ${showOther ? 'text-primary' : 'text-muted-foreground'}`} />
          <div className="font-mono text-sm font-medium text-foreground">
            Other
          </div>
          <div className="font-mono text-xs text-muted-foreground mt-1">
            Specify your field
          </div>
        </button>
      </div>

      {/* Custom Input */}
      {showOther && (
        <Input
          value={customIndustry}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="Enter your industry or field..."
          className="font-mono"
          disabled={disabled}
          autoFocus
        />
      )}
    </div>
  );
};
