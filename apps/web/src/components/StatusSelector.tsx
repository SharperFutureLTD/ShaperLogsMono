'use client'

import { GraduationCap, Briefcase, Search, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EmploymentStatus = 'student' | 'apprentice' | 'employed' | 'job_seeking';

interface StatusOption {
  id: EmploymentStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const statusOptions: StatusOption[] = [
  {
    id: 'student',
    label: 'Student',
    description: 'University, college, or courses',
    icon: GraduationCap,
  },
  {
    id: 'apprentice',
    label: 'Apprentice',
    description: 'Work-based learning and training',
    icon: Wrench,
  },
  {
    id: 'employed',
    label: 'Employed',
    description: 'Currently working professionally',
    icon: Briefcase,
  },
  {
    id: 'job_seeking',
    label: 'Job Seeking',
    description: 'Looking for opportunities',
    icon: Search,
  },
];

export const getStatusLabel = (statusId: EmploymentStatus | null): string => {
  if (!statusId) return 'Not set';
  const status = statusOptions.find((s) => s.id === statusId);
  return status?.label || 'Not set';
};

interface StatusSelectorProps {
  selectedStatus: EmploymentStatus | null;
  onSelect: (status: EmploymentStatus) => void;
  disabled?: boolean;
}

export const StatusSelector = ({
  selectedStatus,
  onSelect,
  disabled = false,
}: StatusSelectorProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statusOptions.map((status) => {
        const Icon = status.icon;
        const isSelected = selectedStatus === status.id;

        return (
          <button
            key={status.id}
            onClick={() => onSelect(status.id)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200',
              'hover:border-primary/50 hover:bg-accent/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isSelected
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card'
            )}
          >
            <Icon
              className={cn(
                'h-8 w-8 mb-2 transition-colors',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn(
                'font-mono text-sm font-medium',
                isSelected ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {status.label}
            </span>
            <span className="text-xs text-muted-foreground mt-1 text-center">
              {status.description}
            </span>
          </button>
        );
      })}
    </div>
  );
};
