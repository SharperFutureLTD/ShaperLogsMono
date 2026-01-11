'use client'

import { useState, useMemo } from "react";
import { Plus, Target, Upload, Trash2 } from "lucide-react";
import { useTargets } from "@/hooks/useTargets";
import { useWorkEntries } from "@/hooks/useWorkEntries";
import { TargetList } from "@/components/targets/TargetList";
import { TargetUpload } from "@/components/targets/TargetUpload";
import { TargetForm } from "@/components/targets/TargetForm";
import { ClearAllDialog } from "@/components/targets/ClearAllDialog";
import { TargetFilters, type TargetTypeFilter, type TargetStatusFilter } from "@/components/targets/TargetFilters";
import { StatsCards } from "@/components/progress/StatsCards";
import { ActivityChart } from "@/components/progress/ActivityChart";
import { TopSkillsSection } from "@/components/progress/TopSkillsSection";
import { calculateStreak } from "@/lib/utils/analytics";
import type { Target as TargetType } from "@/types/targets";

type PeriodFilter = 'week' | 'month' | 'year';

export function TargetsMode() {
  const { targets, loading: isLoading, refetch: fetchTargets, deleteTarget, archiveTarget, updateTarget } = useTargets();
  const { entries } = useWorkEntries();
  const [showUpload, setShowUpload] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');

  // Filter state for targets
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TargetTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<TargetStatusFilter>('all');

  const handleComplete = () => {
    setShowUpload(false);
    setShowForm(false);
    fetchTargets();
  };

  const handleClearAll = async () => {
    for (const target of targets) {
      await deleteTarget(target.id);
    }
    fetchTargets();
  };

  // Calculate status for a target
  const getTargetStatus = (target: TargetType): 'on_track' | 'overdue' | 'completed' => {
    const hasNumericTarget = target.target_value !== null && target.target_value > 0;
    const progress = hasNumericTarget
      ? Math.min((target.current_value / target.target_value!) * 100, 100)
      : null;

    if (progress !== null && progress >= 100) return 'completed';
    if (target.deadline && new Date(target.deadline) < new Date()) return 'overdue';
    return 'on_track';
  };

  // Filtered targets
  const filteredTargets = useMemo(() => {
    return targets.filter(target => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = target.name.toLowerCase().includes(query);
        const matchesDescription = target.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }
      if (typeFilter !== 'all' && target.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        const status = getTargetStatus(target);
        if (status !== statusFilter) return false;
      }
      return true;
    });
  }, [targets, searchQuery, typeFilter, statusFilter]);

  // Calculate streak from all entries (streak doesn't depend on period filter)
  const streakData = useMemo(() => {
    return calculateStreak(entries);
  }, [entries]);

  // Calculate stats based on period
  const stats = useMemo(() => {
    const now = new Date();
    let periodDays: number;

    switch (periodFilter) {
      case 'week':
        periodDays = 7;
        break;
      case 'month':
        periodDays = 30;
        break;
      case 'year':
        periodDays = 365;
        break;
    }

    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Current period entries
    const periodEntries = entries.filter(e => new Date(e.created_at) >= startDate);
    const allSkills = periodEntries.flatMap(e => e.skills || []);
    const uniqueSkills = new Set(allSkills);

    // Previous period entries (for comparison)
    const previousPeriodEntries = entries.filter(e => {
      const date = new Date(e.created_at);
      return date >= previousStartDate && date < startDate;
    });
    const previousSkills = new Set(previousPeriodEntries.flatMap(e => e.skills || []));

    // Calculate growth percentage
    let logsGrowth = 0;
    if (previousPeriodEntries.length > 0) {
      logsGrowth = Math.round(((periodEntries.length - previousPeriodEntries.length) / previousPeriodEntries.length) * 100);
    } else if (periodEntries.length > 0) {
      logsGrowth = 100;
    }

    // Calculate new skills (difference from previous period)
    const newSkills = Math.max(0, uniqueSkills.size - previousSkills.size);

    return {
      logsCount: periodEntries.length,
      logsGrowth,
      skillsCount: uniqueSkills.size,
      newSkills,
      currentStreak: streakData.currentStreak,
      bestStreak: streakData.bestStreak,
    };
  }, [entries, periodFilter, streakData]);

  // Activity chart data
  const activityData = useMemo(() => {
    const data: { date: string; count: number }[] = [];
    const entriesByDate = new Map<string, number>();

    entries.forEach(entry => {
      const date = entry.created_at.split('T')[0];
      entriesByDate.set(date, (entriesByDate.get(date) || 0) + 1);
    });

    entriesByDate.forEach((count, date) => {
      data.push({ date, count });
    });

    return data;
  }, [entries]);

  // Top skills data
  const topSkills = useMemo(() => {
    const skillCounts = new Map<string, number>();

    entries.forEach(entry => {
      (entry.skills || []).forEach(skill => {
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
      });
    });

    return Array.from(skillCounts.entries())
      .map(([name, count]) => ({ name, count, growth: Math.random() > 0.5 ? 1 : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [entries]);

  // Adapter for onUpdate
  const handleUpdate = async (targetId: string, updates: Partial<TargetType>): Promise<TargetType | null> => {
    const success = await updateTarget(targetId, updates);
    if (success) {
      const updatedTarget = targets.find(t => t.id === targetId);
      return updatedTarget ? { ...updatedTarget, ...updates } : null;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex items-center justify-end gap-2">
        {(['week', 'month', 'year'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setPeriodFilter(period)}
            className={`filter-pill ${periodFilter === period ? 'active' : ''}`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <StatsCards {...stats} />

      {/* Activity chart */}
      <ActivityChart data={activityData} />

      {/* Top Skills Section */}
      <TopSkillsSection skills={topSkills} />

      {/* Active Targets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Active Targets</h3>
          <div className="flex items-center gap-2">
            {targets.length > 0 && (
              <button
                onClick={() => setShowClearAllDialog(true)}
                className="btn-ghost text-xs flex items-center gap-1.5"
                style={{ color: '#EF4444' }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All
              </button>
            )}
            <button
              onClick={() => {
                setShowUpload(!showUpload);
                setShowForm(false);
              }}
              className="btn-outline"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </button>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setShowUpload(false);
              }}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Target
            </button>
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div>
            <TargetUpload onComplete={handleComplete} />
          </div>
        )}

        {/* Manual Form */}
        {showForm && (
          <div>
            <TargetForm onComplete={handleComplete} />
          </div>
        )}

        {/* Filters */}
        <TargetFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Target List or Empty State */}
        {targets.length === 0 ? (
          <div className="empty-card">
            <Target className="h-6 w-6 mx-auto mb-2" style={{ color: '#5C6660' }} />
            <p className="text-sm" style={{ color: '#5C6660' }}>
              No targets yet. Add a target to start tracking your progress.
            </p>
          </div>
        ) : (
          <TargetList
            targets={filteredTargets}
            isLoading={isLoading}
            onDelete={deleteTarget}
            onArchive={archiveTarget}
            onUpdate={handleUpdate}
          />
        )}
      </div>

      {/* Clear All Dialog */}
      <ClearAllDialog
        open={showClearAllDialog}
        onOpenChange={setShowClearAllDialog}
        onConfirm={handleClearAll}
        targetCount={targets.length}
      />
    </div>
  );
}
