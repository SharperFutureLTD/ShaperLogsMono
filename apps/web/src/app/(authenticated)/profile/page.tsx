'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IndustrySelector, getIndustryLabel } from '@/components/IndustrySelector';
import { StatusSelector, getStatusLabel, EmploymentStatus } from '@/components/StatusSelector';
import { StudyFieldSelector, getStudyFieldLabel } from '@/components/StudyFieldSelector';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const [selectedStatus, setSelectedStatus] = useState<EmploymentStatus | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedStudyField, setSelectedStudyField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (profile) {
      setSelectedStatus(profile.employment_status);
      setSelectedIndustry(profile.industry);
      setSelectedStudyField(profile.study_field);
    }
  }, [profile]);

  useEffect(() => {
    const statusChanged = selectedStatus !== profile?.employment_status;
    const industryChanged = selectedIndustry !== profile?.industry;
    const studyFieldChanged = selectedStudyField !== profile?.study_field;
    setHasChanges(statusChanged || industryChanged || studyFieldChanged);
  }, [selectedStatus, selectedIndustry, selectedStudyField, profile]);

  // Determine which fields to show based on selected status
  const showStudyField = selectedStatus === 'student' || selectedStatus === 'apprentice';
  const showIndustry = selectedStatus === 'apprentice' || selectedStatus === 'employed' || selectedStatus === 'job_seeking';

  const handleSave = async () => {
    setIsSaving(true);

    const updateData: {
      employmentStatus?: EmploymentStatus;
      industry?: string | null;
      studyField?: string | null;
    } = {};

    if (selectedStatus !== profile?.employment_status) {
      updateData.employmentStatus = selectedStatus!;
    }

    // Clear fields that are no longer relevant for the new status
    if (selectedStatus === 'student') {
      // Students only have study field, clear industry
      updateData.industry = selectedStudyField; // Use study field as industry for students
      updateData.studyField = selectedStudyField;
    } else if (selectedStatus === 'apprentice') {
      // Apprentices have both
      updateData.industry = selectedIndustry;
      updateData.studyField = selectedStudyField;
    } else {
      // Employed/job seeking only have industry, clear study field
      updateData.industry = selectedIndustry;
      updateData.studyField = null;
    }

    const success = await updateProfile(updateData);
    setIsSaving(false);

    if (success) {
      toast.success('Profile updated successfully');
      setHasChanges(false);
    } else {
      toast.error('Failed to update profile');
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-mono text-muted-foreground">loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-mono text-sm font-medium">profile</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* User Info */}
        <section>
          <h2 className="font-mono text-xs text-muted-foreground mb-2">account</h2>
          <p className="font-mono text-sm text-foreground">{user?.email}</p>
        </section>

        {/* Current Status Display */}
        <section>
          <h2 className="font-mono text-xs text-muted-foreground mb-2">current situation</h2>
          <p className="font-mono text-sm text-foreground">
            {getStatusLabel(profile?.employment_status || null)}
          </p>
        </section>

        {/* Status Selector */}
        <section>
          <h2 className="font-mono text-xs text-muted-foreground mb-4">change situation</h2>
          <StatusSelector
            selectedStatus={selectedStatus}
            onSelect={setSelectedStatus}
            disabled={isSaving}
          />
        </section>

        {/* Study Field (for students and apprentices) */}
        {showStudyField && (
          <section>
            <h2 className="font-mono text-xs text-muted-foreground mb-2">
              {selectedStatus === 'apprentice' ? 'studying towards' : 'field of study'}
            </h2>
            <p className="font-mono text-sm text-foreground mb-4">
              Current: {getStudyFieldLabel(profile?.study_field || null)}
            </p>
            <StudyFieldSelector
              selectedField={selectedStudyField}
              onSelect={setSelectedStudyField}
              disabled={isSaving}
            />
          </section>
        )}

        {/* Industry (for apprentices, employed, job seeking) */}
        {showIndustry && (
          <section>
            <h2 className="font-mono text-xs text-muted-foreground mb-2">
              {selectedStatus === 'job_seeking' ? 'target industry' : 'industry'}
            </h2>
            <p className="font-mono text-sm text-foreground mb-4">
              Current: {getIndustryLabel(profile?.industry || null)}
            </p>
            <IndustrySelector
              selectedIndustry={selectedIndustry}
              onSelect={setSelectedIndustry}
              disabled={isSaving}
            />
          </section>
        )}

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="font-mono gap-2"
            >
              {isSaving ? (
                'saving...'
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  save changes
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
