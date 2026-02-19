'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { useWizardStateWithPersistence } from './useWizardPersistence';
import { WizardNavigation } from './WizardNavigation';
import { WIZARD_STEPS, getStepFromNumber, type WizardState, type WizardAction } from './useWizardState';

// Lazy load step components for better performance
const BasicsStep = React.lazy(() => import('./steps/BasicsStep'));
const DatesStep = React.lazy(() => import('./steps/DatesStep'));
const VenuesStep = React.lazy(() => import('./steps/VenuesStep'));
const TracksStep = React.lazy(() => import('./steps/TracksStep'));
const VotingStep = React.lazy(() => import('./steps/VotingStep'));
const BrandingStep = React.lazy(() => import('./steps/BrandingStep'));

// ============================================================================
// Step Props Interface
// ============================================================================

interface StepProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

// ============================================================================
// Placeholder Components for Missing Steps
// ============================================================================

function ScheduleStepPlaceholder({ state }: StepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Configuration</CardTitle>
        <CardDescription>
          Configure time slots for your event
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Schedule configuration will be available soon.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            You can skip this step and configure the schedule later.
          </p>
          {state.venues.length === 0 && (
            <p className="text-sm text-amber-500 mt-4">
              Tip: Add venues first to create time slots for specific rooms.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewStepPlaceholder({ state }: StepProps) {
  const { basics, dates, venues, tracks, voting, branding } = state;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Event</CardTitle>
          <CardDescription>
            Review the details before creating your event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basics Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Event Details
            </h4>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{basics.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">URL:</span>
                <span className="font-mono text-sm">/e/{basics.slug || 'not-set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="capitalize">{basics.eventType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visibility:</span>
                <span className="capitalize">{basics.visibility}</span>
              </div>
            </div>
          </div>

          {/* Dates Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Dates & Location
            </h4>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start:</span>
                <span>{dates.startDate || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">End:</span>
                <span>{dates.endDate || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timezone:</span>
                <span>{dates.timezone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location Type:</span>
                <span className="capitalize">{dates.locationType}</span>
              </div>
            </div>
          </div>

          {/* Venues Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Venues ({venues.length})
            </h4>
            {venues.length > 0 ? (
              <div className="rounded-lg border p-4 space-y-2">
                {venues.map((venue) => (
                  <div key={venue.id} className="flex justify-between">
                    <span>{venue.name}</span>
                    <span className="text-muted-foreground">
                      {venue.capacity ? `${venue.capacity} capacity` : 'No capacity set'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No venues configured</p>
            )}
          </div>

          {/* Tracks Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tracks ({tracks.length})
            </h4>
            {tracks.length > 0 ? (
              <div className="rounded-lg border p-4 flex flex-wrap gap-2">
                {tracks.map((track) => (
                  <span
                    key={track.id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${track.color}20`, color: track.color }}
                  >
                    {track.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No tracks configured</p>
            )}
          </div>

          {/* Voting Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Voting Configuration
            </h4>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mechanism:</span>
                <span className="capitalize">{voting.mechanism}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credits per user:</span>
                <span>{voting.credits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max proposals:</span>
                <span>{voting.maxProposalsPerUser} per user</span>
              </div>
            </div>
          </div>

          {/* Branding Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Branding
            </h4>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: branding.theme.primary }}
                    title="Primary color"
                  />
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: branding.theme.secondary }}
                    title="Secondary color"
                  />
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: branding.theme.accent }}
                    title="Accent color"
                  />
                </div>
                <span className="text-muted-foreground">
                  Theme: {branding.theme.mode}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning card */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="flex items-start gap-4 py-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Ready to create?</p>
            <p className="text-sm text-muted-foreground">
              The event creation feature will be available soon. For now, your draft is saved
              and you can return to continue editing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
        return <ScheduleStepPlaceholder {...props} />;
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
        return <ReviewStepPlaceholder {...props} />;
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
