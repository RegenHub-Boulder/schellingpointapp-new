'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useWizardStateWithPersistence } from './useWizardPersistence';
import { WizardNavigation } from './WizardNavigation';
import { WIZARD_STEPS, getStepFromNumber, type WizardState, type WizardAction } from './useWizardState';

// ============================================================================
// Auth Helpers
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      const session = JSON.parse(stored);
      return session?.access_token || null;
    } catch {
      return null;
    }
  }
  return null;
}

// Lazy load step components for better performance
const BasicsStep = React.lazy(() => import('./steps/BasicsStep'));
const DatesStep = React.lazy(() => import('./steps/DatesStep'));
const VenuesStep = React.lazy(() => import('./steps/VenuesStep'));
const ScheduleStep = React.lazy(() => import('./steps/ScheduleStep'));
const TracksStep = React.lazy(() => import('./steps/TracksStep'));
const VotingStep = React.lazy(() => import('./steps/VotingStep'));
const BrandingStep = React.lazy(() => import('./steps/BrandingStep'));
const ReviewStep = React.lazy(() => import('./steps/ReviewStep'));

// ============================================================================
// Step Props Interface
// ============================================================================

interface StepProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

// ============================================================================
// Step Loading Fallback
// ============================================================================

function StepLoadingFallback() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Resume Draft Dialog
// ============================================================================

interface ResumeDraftDialogProps {
  timestamp: Date | null;
  onResume: () => void;
  onStartFresh: () => void;
}

function ResumeDraftDialog({ timestamp, onResume, onStartFresh }: ResumeDraftDialogProps) {
  const formattedTime = timestamp
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(timestamp)
    : 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Resume Your Draft?</CardTitle>
          <CardDescription>
            You have a saved draft from {formattedTime}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Would you like to continue where you left off, or start fresh?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onStartFresh} className="flex-1">
              Start Fresh
            </Button>
            <Button onClick={onResume} className="flex-1">
              Resume Draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Wizard Content
// ============================================================================

function CreateWizardContent() {
  const router = useRouter();
  const {
    state,
    dispatch,
    nextStep,
    prevStep,
    clearDraft,
    hasSavedDraft,
    getDraftTimestamp,
    currentStepName,
  } = useWizardStateWithPersistence();

  // State for showing resume dialog
  const [showResumeDialog, setShowResumeDialog] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [slugSuggestions, setSlugSuggestions] = React.useState<string[]>([]);

  // Check for saved draft on mount
  React.useEffect(() => {
    // Only check on initial mount
    if (!isInitialized) {
      const hasDraft = hasSavedDraft();
      if (hasDraft && state.basics.name === '' && state.currentStep === 0) {
        // There's a draft but state is empty, show resume dialog
        setShowResumeDialog(true);
      }
      setIsInitialized(true);
    }
  }, [hasSavedDraft, isInitialized, state.basics.name, state.currentStep]);

  // Handle resume draft
  const handleResume = React.useCallback(() => {
    setShowResumeDialog(false);
    // State is already loaded by useWizardStateWithPersistence
  }, []);

  // Handle start fresh
  const handleStartFresh = React.useCallback(() => {
    clearDraft(true);
    setShowResumeDialog(false);
  }, [clearDraft]);

  // Handler for next step (called after WizardNavigation validation)
  const handleNext = React.useCallback(() => {
    // WizardNavigation handles validation
    // This callback is called after successful navigation
  }, []);

  // Handler for previous step
  const handlePrev = React.useCallback(() => {
    // No additional logic needed
  }, []);

  // Handler for event submission
  const handleSubmit = React.useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSlugSuggestions([]);

    try {
      // Get the access token
      const accessToken = getAccessToken();
      if (!accessToken) {
        setSubmitError('You must be logged in to create an event. Please sign in and try again.');
        setIsSubmitting(false);
        return;
      }

      // Call the event creation API
      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ wizardState: state }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle specific error cases
        if (response.status === 401) {
          setSubmitError('Your session has expired. Please sign in again.');
        } else if (response.status === 409) {
          // Slug conflict - show suggestions
          setSubmitError(data.error || 'This event URL is already taken.');
          if (data.suggestions?.length > 0) {
            setSlugSuggestions(data.suggestions);
          }
        } else {
          setSubmitError(data.error || 'Failed to create event. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      // Success! Clear the draft and redirect to the new event dashboard
      clearDraft();

      // Redirect to the event dashboard
      const eventSlug = data.eventSlug || data.event?.slug;
      if (eventSlug) {
        router.push(`/e/${eventSlug}/admin`);
      } else {
        // Fallback to home if no slug (shouldn't happen)
        router.push('/');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  }, [state, clearDraft, router]);

  // Handler to apply a slug suggestion
  const handleApplySlugSuggestion = React.useCallback((suggestion: string) => {
    dispatch({ type: 'UPDATE_BASICS', payload: { slug: suggestion } });
    setSlugSuggestions([]);
    setSubmitError(null);
  }, [dispatch]);

  // Get current step component
  const renderStep = () => {
    const stepName = getStepFromNumber(state.currentStep);
    const props: StepProps = { state, dispatch };

    switch (stepName) {
      case 'basics':
        return (
          <Suspense fallback={<StepLoadingFallback />}>
            <BasicsStep {...props} />
          </Suspense>
        );
      case 'dates':
        return (
          <Suspense fallback={<StepLoadingFallback />}>
            <DatesStep {...props} />
          </Suspense>
        );
      case 'venues':
        return (
          <Suspense fallback={<StepLoadingFallback />}>
            <VenuesStep {...props} />
          </Suspense>
        );
      case 'schedule':
        return (
          <Suspense fallback={<StepLoadingFallback />}>
            <ScheduleStep {...props} />
          </Suspense>
        );
      case 'tracks':
        return (
          <Suspense fallback={<StepLoadingFallback />}>
            <TracksStep {...props} />
          </Suspense>
        );
      case 'voting':
        return (
          <Suspense fallback={<StepLoadingFallback />}>
            <VotingStep {...props} />
          </Suspense>
        );
      case 'branding':
        return (
          <Suspense fallback={<StepLoadingFallback />}>
            <BrandingStep {...props} />
          </Suspense>
        );
      case 'review':
        return (
          <Suspense fallback={<StepLoadingFallback />}>
            <ReviewStep
              state={state}
              dispatch={dispatch}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </Suspense>
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to home
            </Link>
            <div className="text-sm text-muted-foreground">
              Draft auto-saved
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Page Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Create Event</h1>
            <p className="text-muted-foreground">
              Set up your unconference, hackathon, or community event
            </p>
          </div>

          {/* Wizard Content */}
          <div className="space-y-8">
            {/* Error Alert */}
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p>{submitError}</p>
                  {slugSuggestions.length > 0 && (
                    <div className="pt-2">
                      <p className="text-sm font-medium mb-2">Try one of these available URLs:</p>
                      <div className="flex flex-wrap gap-2">
                        {slugSuggestions.map((suggestion) => (
                          <Button
                            key={suggestion}
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplySlugSuggestion(suggestion)}
                            className="font-mono text-xs"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Step Content */}
            <div className="min-h-[400px]">
              {renderStep()}
            </div>

            {/* Navigation */}
            <Card>
              <CardContent className="py-6">
                <WizardNavigation
                  state={state}
                  dispatch={dispatch}
                  onNext={handleNext}
                  onPrev={handlePrev}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Resume Draft Dialog */}
      {showResumeDialog && (
        <ResumeDraftDialog
          timestamp={getDraftTimestamp()}
          onResume={handleResume}
          onStartFresh={handleStartFresh}
        />
      )}
    </div>
  );
}

// ============================================================================
// Page Export with Suspense
// ============================================================================

export default function CreateEventPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted/30">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CreateWizardContent />
    </Suspense>
  );
}
