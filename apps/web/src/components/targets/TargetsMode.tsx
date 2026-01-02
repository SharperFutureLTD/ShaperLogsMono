'use client'

import { useState, useMemo } from "react";
import { Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTargets } from "@/hooks/useTargets";
import { TargetList } from "@/components/targets/TargetList";
import { TargetUpload } from "@/components/targets/TargetUpload";
import { TargetForm } from "@/components/targets/TargetForm";
import { TargetFilters, type TargetTypeFilter, type TargetStatusFilter } from "@/components/targets/TargetFilters";
import type { Target } from "@/types/targets";

export function TargetsMode() {
  const { targets, loading: isLoading, refetch: fetchTargets, deleteTarget, updateTarget } = useTargets();
  const [showUpload, setShowUpload] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TargetTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<TargetStatusFilter>('all');

  const handleComplete = () => {
    setShowUpload(false);
    setShowForm(false);
    fetchTargets();
  };

  // Calculate status for a target
  const getTargetStatus = (target: Target): 'on_track' | 'overdue' | 'completed' => {
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
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = target.name.toLowerCase().includes(query);
        const matchesDescription = target.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && target.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all') {
        const status = getTargetStatus(target);
        if (status !== statusFilter) return false;
      }

      return true;
    });
  }, [targets, searchQuery, typeFilter, statusFilter]);

  // Calculate stats from filtered targets for summary
  const stats = useMemo(() => ({
    total: filteredTargets.length,
    withEvidence: filteredTargets.filter(t => t.current_value && t.current_value >= 1).length,
    overdue: filteredTargets.filter(t => getTargetStatus(t) === 'overdue').length,
  }), [filteredTargets]);

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-2 justify-center">
        <Button
          variant={showUpload ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowUpload(!showUpload);
            setShowForm(false);
          }}
          className="font-mono text-xs"
        >
          <Upload className="h-3 w-3 mr-1" />
          [UPLOAD DOCUMENT]
        </Button>
        <Button
          variant={showForm ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowForm(!showForm);
            setShowUpload(false);
          }}
          className="font-mono text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          [ADD MANUALLY]
        </Button>
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

      {/* Target List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm text-muted-foreground">
            Active Targets
          </h2>
          {filteredTargets.length !== targets.length && (
            <span className="font-mono text-xs text-muted-foreground">
              Showing {filteredTargets.length} of {targets.length}
            </span>
          )}
        </div>
        <TargetList
          targets={filteredTargets}
          isLoading={isLoading}
          onDelete={deleteTarget}
          onUpdate={updateTarget}
        />
      </div>

      {/* Summary Stats */}
      {targets.length > 0 && (
        <div className="p-4 border border-border rounded-lg bg-card">
          <h3 className="font-mono text-xs text-muted-foreground mb-3">
            Summary
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-mono text-2xl font-bold text-foreground">
                {stats.total}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                Total Targets
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-primary">
                {stats.withEvidence}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                With Evidence
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-destructive">
                {stats.overdue}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                Overdue
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
