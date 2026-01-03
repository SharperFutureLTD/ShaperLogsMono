'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusSelector, EmploymentStatus } from '@/components/StatusSelector';
import { StudyFieldSelector } from '@/components/StudyFieldSelector';
import { IndustrySelector } from '@/components/IndustrySelector';
import { CareerHistorySection } from '@/components/career/CareerHistorySection';
import { ArrowLeft } from 'lucide-react';

interface OnboardingProps {
  onComplete: (data: {
    employmentStatus: EmploymentStatus;
    industry: string;
    studyField?: string;
  }) => void;
  isSubmitting?: boolean;
}

type OnboardingStep = 'status' | 'industry' | 'field' | 'history';

export const Onboarding = ({ onComplete, isSubmitting = false }: OnboardingProps) => {
  const [step, setStep] = useState<OnboardingStep>('status');
  const [selectedStatus, setSelectedStatus] = useState<EmploymentStatus | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedStudyField, setSelectedStudyField] = useState<string | null>(null);

  const getTotalSteps = () => {
    // History is always the last step now
    if (selectedStatus === 'apprentice') return 4;
    return 3;
  };

  const getCurrentStepNumber = () => {
    if (step === 'status') return 1;
    if (step === 'industry') return 2;
    if (step === 'field') return selectedStatus === 'apprentice' ? 3 : 2;
    if (step === 'history') return selectedStatus === 'apprentice' ? 4 : 3;
    return 1;
  };

  const handleContinue = async () => {
    if (step === 'status' && selectedStatus) {
      if (selectedStatus === 'student') {
        setStep('field');
      } else if (selectedStatus === 'apprentice') {
        setStep('industry');
      } else {
        // employed or job_seeking
        setStep('industry');
      }
    } else if (step === 'industry' && selectedIndustry) {
      if (selectedStatus === 'apprentice') {
        setStep('field');
      } else {
        // employed or job_seeking -> history
        setStep('history');
      }
    } else if (step === 'field') {
      if (selectedStatus === 'student' && selectedStudyField) {
        setStep('history');
      } else if (selectedStatus === 'apprentice' && selectedStudyField && selectedIndustry) {
        setStep('history');
      }
    } else if (step === 'history') {
      // Final completion
      if (selectedStatus === 'student' && selectedStudyField) {
        await onComplete({
          employmentStatus: selectedStatus,
          industry: selectedStudyField,
          studyField: selectedStudyField,
        });
      } else if (selectedStatus === 'apprentice' && selectedStudyField && selectedIndustry) {
        await onComplete({
          employmentStatus: selectedStatus,
          industry: selectedIndustry,
          studyField: selectedStudyField,
        });
      } else if (selectedStatus && selectedIndustry) {
        await onComplete({
          employmentStatus: selectedStatus,
          industry: selectedIndustry,
        });
      }
    }
  };

  const handleBack = () => {
    if (step === 'history') {
      if (selectedStatus === 'student') {
        setStep('field');
      } else if (selectedStatus === 'apprentice') {
        setStep('field');
      } else {
        setStep('industry');
      }
    } else if (step === 'field') {
      if (selectedStatus === 'apprentice') {
        setStep('industry');
      } else {
        setStep('status');
      }
    } else if (step === 'industry') {
      setStep('status');
    }
  };

  const handleSkip = async () => {
    // If skipping from history, just complete
    if (step === 'history') {
      await handleContinue();
      return;
    }

    // Otherwise skip entire flow
    await onComplete({
      employmentStatus: selectedStatus || 'employed',
      industry: 'general',
    });
  };

  const canContinue = () => {
    if (step === 'status') {
      return !!selectedStatus;
    }
    if (step === 'industry') {
      return !!selectedIndustry;
    }
    if (step === 'field') {
      return !!selectedStudyField;
    }
    if (step === 'history') {
      return true; // Optional step
    }
    return false;
  };

  const getStepConfig = () => {
    if (step === 'status') {
      return {
        title: "what's your situation?",
        subtitle: 'this helps us tailor the experience to your needs',
      };
    }

    if (step === 'industry') {
      if (selectedStatus === 'apprentice') {
        return {
          title: 'what industry are you in?',
          subtitle: "your employer's field helps us understand your context",
        };
      }
      if (selectedStatus === 'job_seeking') {
        return {
          title: 'what field are you targeting?',
          subtitle: 'this helps us tailor skills and content to your goals',
        };
      }
      return {
        title: "what's your field?",
        subtitle: 'this helps us tailor skills and achievements to your career',
      };
    }

    if (step === 'field') {
      if (selectedStatus === 'apprentice') {
        return {
          title: 'what are you studying towards?',
          subtitle: 'your qualification helps us track your learning',
        };
      }
      return {
        title: 'what are you studying?',
        subtitle: 'this helps us tailor skills and content to your field',
      };
    }

    if (step === 'history') {
      return {
        title: 'career history',
        subtitle: 'add your previous roles to give the AI more context (optional)',
      };
    }

    return {
      title: "let's get started",
      subtitle: 'tell us about yourself',
    };
  };

  const config = getStepConfig();
  const totalSteps = getTotalSteps();
  const currentStep = getCurrentStepNumber();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Back Button */}
        {step !== 'status' && (
          <button
            onClick={handleBack}
            disabled={isSubmitting}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm font-mono mb-4 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            back
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-mono font-bold text-foreground mb-2">
            {config.title}<span className="cursor-blink">_</span>
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            {config.subtitle}
          </p>
        </div>

        {/* Step Content */}
        <div className="mb-6">
          {step === 'status' && (
            <StatusSelector
              selectedStatus={selectedStatus}
              onSelect={setSelectedStatus}
              disabled={isSubmitting}
            />
          )}

          {step === 'industry' && (
            <IndustrySelector
              selectedIndustry={selectedIndustry}
              onSelect={setSelectedIndustry}
              disabled={isSubmitting}
            />
          )}

          {step === 'field' && (
            <StudyFieldSelector
              selectedField={selectedStudyField}
              onSelect={setSelectedStudyField}
              disabled={isSubmitting}
            />
          )}

          {step === 'history' && (
            <div className="bg-card border rounded-lg p-6">
              <CareerHistorySection />
            </div>
          )}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleContinue}
            disabled={!canContinue() || isSubmitting}
            className="font-mono px-8"
          >
            {isSubmitting ? 'saving...' : step === 'history' ? 'finish setup' : 'continue'}
          </Button>
        </div>

        {/* Skip Option */}
        {step !== 'history' && (
          <div className="text-center mt-4">
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-foreground text-xs font-mono transition-colors disabled:opacity-50"
            >
              skip for now
            </button>
          </div>
        )}
        
        {step === 'history' && (
          <div className="text-center mt-4">
            <button
              onClick={handleContinue}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-foreground text-xs font-mono transition-colors disabled:opacity-50"
            >
              skip this step
            </button>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                index + 1 <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
