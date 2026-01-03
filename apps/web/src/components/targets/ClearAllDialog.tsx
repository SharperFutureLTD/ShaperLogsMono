'use client'

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClearAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  targetCount: number;
}

export function ClearAllDialog({ open, onOpenChange, onConfirm, targetCount }: ClearAllDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText === 'DELETE';

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      setConfirmText('');
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setConfirmText('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete All Targets?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This will permanently delete all <span className="font-bold text-destructive">{targetCount}</span> of your targets.
              This action cannot be undone.
            </p>
            <div className="space-y-2">
              <Label htmlFor="confirm-text" className="text-foreground">
                Type <span className="font-mono font-bold">DELETE</span> to confirm:
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="font-mono"
                autoComplete="off"
              />
            </div>
            {confirmText && !isConfirmed && (
              <p className="text-sm text-destructive">
                Please type "DELETE" in all caps to confirm.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete All Targets
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
