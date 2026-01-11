'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Crown, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { IndustrySelector, getIndustryLabel } from '@/components/IndustrySelector';
import { StatusSelector, getStatusLabel, EmploymentStatus } from '@/components/StatusSelector';
import { StudyFieldSelector, getStudyFieldLabel } from '@/components/StudyFieldSelector';
import { CareerHistorySection } from '@/components/career/CareerHistorySection';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { hasSubscription, isActive } = useSubscription();
  const [selectedStatus, setSelectedStatus] = useState<EmploymentStatus | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedStudyField, setSelectedStudyField] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (profile) {
      setSelectedStatus(profile.employment_status as EmploymentStatus | null);
      setSelectedIndustry(profile.industry);
      setSelectedStudyField(profile.study_field);
      setDisplayName(profile.display_name || '');
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
        <div className="font-mono text-muted-foreground">Loading...</div>
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
          <h1 className="font-mono text-sm font-medium">Profile</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* User Info */}
        <section className="space-y-4">
          <h2 className="font-mono text-xs text-muted-foreground">Account</h2>

          {/* Display Name */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-muted-foreground">Display Name</label>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="max-w-xs font-mono text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    const success = await updateProfile({ displayName: displayName || null });
                    if (success) {
                      toast.success('Name updated');
                      setIsEditingName(false);
                    } else {
                      toast.error('Failed to update name');
                    }
                  }}
                  className="font-mono text-xs"
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingName(false);
                    setDisplayName(profile?.display_name || '');
                  }}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-foreground">
                  {profile?.display_name || 'Not set'}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingName(true)}
                  className="h-6 w-6"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-muted-foreground">Email</label>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm text-foreground">{user?.email}</p>
              {hasSubscription && isActive && (
                <Badge variant="default" className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
                  <Crown className="h-3 w-3" />
                  Pro
                </Badge>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/billing')}
            className="font-mono text-xs text-muted-foreground hover:text-foreground -ml-2"
          >
            Manage subscription →
          </Button>
        </section>

        {/* Current Status Display */}
        <section>
          <h2 className="font-mono text-xs text-muted-foreground mb-2">Current Situation</h2>
          <p className="font-mono text-sm text-foreground">
            {getStatusLabel((profile?.employment_status as EmploymentStatus) || null)}
          </p>
        </section>

        {/* Status Selector */}
        <section>
          <h2 className="font-mono text-xs text-muted-foreground mb-4">Change Situation</h2>
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
              {selectedStatus === 'apprentice' ? 'Studying Towards' : 'Field of Study'}
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
              {selectedStatus === 'job_seeking' ? 'Target Industry' : 'Industry'}
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

        {/* Career History Section */}
        <section>
          <CareerHistorySection />
        </section>

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="font-mono gap-2"
            >
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
