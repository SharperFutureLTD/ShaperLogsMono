'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { useTargets } from "@/hooks/useTargets";
import type { ExtractedTarget } from "@/types/targets";

interface TargetFormProps {
  onComplete: () => void;
}

export function TargetForm({ onComplete }: TargetFormProps) {
  const { createTarget } = useTargets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'goal' as 'kpi' | 'ksb' | 'sales_target' | 'goal',
    target_value: '',
    unit: 'count',
    currency_code: 'GBP',
    deadline: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);

    const target: ExtractedTarget = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      type: formData.type,
      target_value: formData.target_value ? parseFloat(formData.target_value) : undefined,
      unit: formData.unit || undefined,
      currency_code: formData.unit === 'currency' ? formData.currency_code : undefined,
      deadline: formData.deadline || undefined
    };

    await createTarget(target);

    setFormData({
      name: '',
      description: '',
      type: 'goal',
      target_value: '',
      unit: 'count',
      currency_code: 'GBP',
      deadline: ''
    });

    setIsSubmitting(false);
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-lg p-4 space-y-4">
      <h3 className="font-mono text-sm font-medium text-foreground">
        Add Target Manually
      </h3>

      <div className="space-y-3">
        <Input
          placeholder="Target name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="font-mono text-sm"
          required
        />

        <Textarea
          placeholder="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="font-mono text-sm min-h-[60px]"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            value={formData.type}
            onValueChange={(value: 'kpi' | 'ksb' | 'sales_target' | 'goal') =>
              setFormData(prev => ({ ...prev, type: value }))
            }
          >
            <SelectTrigger className="font-mono text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="goal">Goal</SelectItem>
              <SelectItem value="kpi">KPI</SelectItem>
              <SelectItem value="ksb">KSB</SelectItem>
              <SelectItem value="sales_target">Sales Target</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={formData.unit}
            onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
          >
            <SelectTrigger className="font-mono text-xs">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="currency">Currency</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            placeholder="Target value (optional)"
            value={formData.target_value}
            onChange={(e) => setFormData(prev => ({ ...prev, target_value: e.target.value }))}
            className="font-mono text-sm"
          />

          <Input
            type="date"
            placeholder="Deadline (optional)"
            value={formData.deadline}
            onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
            className="font-mono text-sm"
          />
        </div>

        {formData.unit === 'currency' && (
          <Select
            value={formData.currency_code}
            onValueChange={(value) => setFormData(prev => ({ ...prev, currency_code: value }))}
          >
            <SelectTrigger className="font-mono text-xs">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={!formData.name.trim() || isSubmitting}
        className="w-full font-mono text-xs"
      >
        {isSubmitting ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Plus className="h-3 w-3 mr-1" />
        )}
        [ADD TARGET]
      </Button>
    </form>
  );
}
