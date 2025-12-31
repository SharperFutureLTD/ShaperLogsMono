'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Target } from "@/types/targets";

interface TargetEditFormProps {
  target: Target;
  onSave: (updates: Partial<Target>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function TargetEditForm({ target, onSave, onCancel, isSaving }: TargetEditFormProps) {
  const [name, setName] = useState(target.name);
  const [description, setDescription] = useState(target.description || '');
  const [type, setType] = useState<Target['type']>(target.type);
  const [targetValue, setTargetValue] = useState(target.target_value?.toString() || '');
  const [currentValue, setCurrentValue] = useState(target.current_value.toString());
  const [unit, setUnit] = useState(target.unit || '');
  const [currencyCode, setCurrencyCode] = useState(target.currency_code || 'GBP');
  const [deadline, setDeadline] = useState<Date | undefined>(
    target.deadline ? new Date(target.deadline) : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      type,
      target_value: targetValue ? parseFloat(targetValue) : null,
      current_value: parseFloat(currentValue) || 0,
      unit: unit || null,
      currency_code: currencyCode,
      deadline: deadline ? deadline.toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="font-mono text-xs">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-mono text-sm"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="font-mono text-xs">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="font-mono text-sm min-h-[80px]"
        />
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label className="font-mono text-xs">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as Target['type'])}>
          <SelectTrigger className="font-mono text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kpi">KPI</SelectItem>
            <SelectItem value="ksb">KSB</SelectItem>
            <SelectItem value="sales_target">Sales Target</SelectItem>
            <SelectItem value="goal">Goal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Target Value */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="targetValue" className="font-mono text-xs">Target Value</Label>
          <Input
            id="targetValue"
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="font-mono text-sm"
            placeholder="e.g. 100"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentValue" className="font-mono text-xs">Current Value</Label>
          <Input
            id="currentValue"
            type="number"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            className="font-mono text-sm"
            placeholder="e.g. 50"
          />
        </div>
      </div>

      {/* Unit & Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="font-mono text-xs">Unit</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="font-mono text-sm">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="currency">Currency</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {unit === 'currency' && (
          <div className="space-y-2">
            <Label className="font-mono text-xs">Currency</Label>
            <Select value={currencyCode} onValueChange={setCurrencyCode}>
              <SelectTrigger className="font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <Label className="font-mono text-xs">Deadline</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-mono text-sm",
                !deadline && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {deadline ? format(deadline, "PPP") : "No deadline"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={deadline}
              onSelect={setDeadline}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {deadline && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDeadline(undefined)}
            className="text-xs font-mono text-muted-foreground"
          >
            Clear deadline
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 font-mono text-xs"
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 font-mono text-xs"
          disabled={isSaving || !name.trim()}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
