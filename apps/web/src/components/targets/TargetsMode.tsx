'use client'

import { useState, useMemo } from "react";
import { Plus, Target } from "lucide-react";
import { useTargets } from "@/hooks/useTargets";
import { useWorkEntries } from "@/hooks/useWorkEntries";
import { TargetList } from "@/components/targets/TargetList";
import { TargetUpload } from "@/components/targets/TargetUpload";
import { TargetForm } from "@/components/targets/TargetForm";
import { TargetFilters, type TargetTypeFilter, type TargetStatusFilter } from "@/components/targets/TargetFilters";
import { StatsCards } from "@/components/progress/StatsCards";
import { ActivityChart } from "@/components/progress/ActivityChart";
import { TopSkillsSection } from "@/components/progress/TopSkillsSection";
import type { Target as TargetType } from "@/types/targets";

type PeriodFilter = 'week' | 'month' | 'year';

export function TargetsMode() {
  const { targets, loading: isLoading, refetch: fetchTargets, deleteTarget, archiveTarget, updateTarget } = useTargets();
  const { entries } = useWorkEntries();
  const [showUpload, setShowUpload] = useState(false);
  const [showForm, setShowForm] = useState(false);
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

  // Calculate stats based on period
  const stats = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (periodFilter) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const periodEntries = entries.filter(e => new Date(e.created_at) >= startDate);
    const allSkills = periodEntries.flatMap(e => e.skills || []);
    const uniqueSkills = new Set(allSkills);

    return {
      logsCount: periodEntries.length,
      logsGrowth: 12, // Placeholder - would calculate from previous period
      skillsCount: uniqueSkills.size,
      newSkills: 3, // Placeholder
      currentStreak: 5, // Placeholder - would calculate from entries
      bestStreak: 14, // Placeholder
      hoursLogged: 42, // Placeholder
      hoursGrowth: 8, // Placeholder
    };
  }, [entries, periodFilter]);

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
    </div>
  );
}
