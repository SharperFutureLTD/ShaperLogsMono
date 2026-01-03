'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Plus, Trash2, Briefcase } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CareerHistoryItem {
  id: string;
  title: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export function CareerHistorySection() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch history
  const { data: history, isLoading } = useQuery({
    queryKey: ['career-history'],
    queryFn: async () => {
      const res = await apiClient.getCareerHistory();
      return res.data as CareerHistoryItem[];
    },
  });

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: (data: any) => apiClient.addCareerHistory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-history'] });
      setIsAdding(false);
      toast.success('Role added');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteCareerHistory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-history'] });
      toast.success('Role deleted');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { history } = await apiClient.uploadResume(file);
      
      // Add each extracted item
      for (const item of history) {
        await addMutation.mutateAsync(item);
      }
      toast.success(`Imported ${history.length} roles from resume`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to parse resume');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm text-muted-foreground">career history</h2>
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <Button variant="outline" size="sm" className="font-mono gap-2" disabled={isUploading}>
              <Upload className="h-3 w-3" />
              {isUploading ? 'Parsing...' : 'Import Resume'}
            </Button>
          </div>
          <Button size="sm" onClick={() => setIsAdding(true)} className="font-mono gap-2">
            <Plus className="h-3 w-3" />
            Add Role
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <CareerForm 
              onCancel={() => setIsAdding(false)} 
              onSubmit={(data) => addMutation.mutate(data)}
              isLoading={addMutation.isPending}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 font-mono text-xs text-muted-foreground">loading history...</div>
        ) : history?.length === 0 && !isAdding ? (
          <div className="text-center py-8 border rounded-md bg-muted/50">
            <Briefcase className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-mono text-sm text-muted-foreground">No history logged yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Import your resume or add roles manually.</p>
          </div>
        ) : (
          history?.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.company}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-1">
                      {item.start_date || 'N/A'} — {item.is_current ? 'Present' : item.end_date || 'N/A'}
                    </p>
                    {item.description && (
                      <p className="text-sm mt-2 text-foreground/80">{item.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function CareerForm({ onCancel, onSubmit, isLoading }: { onCancel: () => void, onSubmit: (data: any) => void, isLoading: boolean }) {
  const [isCurrent, setIsCurrent] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit({
      title: formData.get('title'),
      company: formData.get('company'),
      start_date: formData.get('start_date') || null,
      end_date: isCurrent ? null : (formData.get('end_date') || null),
      is_current: isCurrent,
      description: formData.get('description'),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Job Title</Label>
          <Input name="title" required placeholder="e.g. Senior Developer" />
        </div>
        <div className="space-y-2">
          <Label>Company</Label>
          <Input name="company" required placeholder="e.g. Acme Corp" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input name="start_date" type="date" />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input name="end_date" type="date" disabled={isCurrent} />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="current" 
          checked={isCurrent}
          onCheckedChange={(checked) => setIsCurrent(checked as boolean)}
        />
        <Label htmlFor="current">I currently work here</Label>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea name="description" placeholder="Brief summary of your role..." />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Role'}</Button>
      </div>
    </form>
  );
}
