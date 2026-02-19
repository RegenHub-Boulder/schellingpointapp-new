'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Pencil,
  Calendar,
  MapPin,
  Building2,
  Clock,
  Tag,
  Vote,
  Palette,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Globe,
} from 'lucide-react';
import type { WizardState, WizardAction, WizardStepName } from '../useWizardState';
import { WIZARD_STEPS, getNumberFromStep, isStepValid, getStepValidationErrors } from '../useWizardState';

// ============================================================================
// Types
// ============================================================================

interface ReviewStepProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  stepName: WizardStepName;
  onEdit: (step: number) => void;
  children: React.ReactNode;
  isValid?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const VOTING_MECHANISM_LABELS: Record<string, string> = {
  quadratic: 'Quadratic Voting',
  linear: 'Linear Voting',
  approval: 'Approval Voting',
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  'in-person': 'In-person',
  virtual: 'Virtual',
  hybrid: 'Hybrid',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  unconference: 'Unconference',
  hackathon: 'Hackathon',
  conference: 'Conference',
  meetup: 'Meetup',
};

const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Public',
  unlisted: 'Unlisted',
  private: 'Private',
};

const FORMAT_LABELS: Record<string, string> = {
  talk: 'Talk',
  workshop: 'Workshop',
  panel: 'Panel',
  discussion: 'Discussion',
  lightning: 'Lightning Talk',
  demo: 'Demo',
  keynote: 'Keynote',
  networking: 'Networking',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  if (!dateString) return 'Not set';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format a datetime string for display
 */
function formatDateTime(dateTimeString: string | null): string {
  if (!dateTimeString) return 'Not set';
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateTimeString;
  }
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// Sub-Components
// ============================================================================

function Section({ title, icon, stepName, onEdit, children, isValid = true }: SectionProps) {
  const stepNumber = getNumberFromStep(stepName);

  return (
    <Card className={cn(!isValid && 'border-amber-500/50')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('text-muted-foreground', !isValid && 'text-amber-500')}>
              {icon}
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {!isValid && (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(stepNumber)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DataRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium text-right', mono && 'font-mono text-sm')}>{value}</span>
    </div>
  );
}

function ValidationSummary({ state }: { state: WizardState }) {
  const allErrors: { step: WizardStepName; errors: string[] }[] = [];

  // Check each step for validation errors
  WIZARD_STEPS.forEach((stepName, index) => {
    if (stepName === 'review') return; // Skip review step
    const errors = getStepValidationErrors(state, index);
    if (errors.length > 0) {
      allErrors.push({ step: stepName, errors });
    }
  });

  if (allErrors.length === 0) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-400">Ready to create!</p>
            <p className="text-sm text-muted-foreground">
              All required information has been provided.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Please complete the following before creating your event:
            </p>
            <ul className="space-y-1">
              {allErrors.map(({ step, errors }) => (
                <li key={step} className="text-sm text-muted-foreground">
                  <span className="font-medium capitalize">{step}</span>: {errors.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ReviewStep({ state, dispatch, onSubmit, isSubmitting }: ReviewStepProps) {
  const { basics, dates, venues, schedule, tracks, voting, branding } = state;
  const [termsAccepted, setTermsAccepted] = React.useState(false);

  // Navigation handler
  const handleEdit = React.useCallback(
    (stepNumber: number) => {
      dispatch({ type: 'SET_STEP', payload: stepNumber });
    },
    [dispatch]
  );

  // Check if all required steps are valid
  const allStepsValid = React.useMemo(() => {
    return WIZARD_STEPS.every((_, index) => {
      if (index === WIZARD_STEPS.length - 1) return true; // Skip review step
      return isStepValid(state, index);
    });
  }, [state]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!allStepsValid || !termsAccepted) return;
    await onSubmit();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">Review Your Event</h2>
        <p className="text-muted-foreground mt-1">
          Review the details below before creating your event
        </p>
      </div>

      {/* Validation Summary */}
      <ValidationSummary state={state} />

      {/* Basics Section */}
      <Section
        title="Event Details"
        icon={<Tag className="h-5 w-5" />}
        stepName="basics"
        onEdit={handleEdit}
        isValid={isStepValid(state, 0)}
      >
        <div className="space-y-1">
          <DataRow label="Name" value={basics.name || 'Not set'} />
          {basics.tagline && (
            <DataRow label="Tagline" value={truncateText(basics.tagline, 60)} />
          )}
          {basics.description && (
            <DataRow label="Description" value={truncateText(basics.description, 80)} />
          )}
          <DataRow
            label="URL"
            value={
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground">/e/</span>
                {basics.slug || 'not-set'}
              </span>
            }
            mono
          />
          <DataRow label="Type" value={EVENT_TYPE_LABELS[basics.eventType] || basics.eventType} />
          <DataRow label="Visibility" value={VISIBILITY_LABELS[basics.visibility] || basics.visibility} />
        </div>
      </Section>

      {/* Dates Section */}
      <Section
        title="Dates & Location"
        icon={<Calendar className="h-5 w-5" />}
        stepName="dates"
        onEdit={handleEdit}
        isValid={isStepValid(state, 1)}
      >
        <div className="space-y-1">
          <DataRow label="Start Date" value={formatDate(dates.startDate)} />
          <DataRow label="End Date" value={formatDate(dates.endDate)} />
          <DataRow label="Timezone" value={dates.timezone || 'Not set'} />
          <DataRow label="Location Type" value={LOCATION_TYPE_LABELS[dates.locationType] || dates.locationType} />
          {(dates.locationType === 'in-person' || dates.locationType === 'hybrid') && (
            <>
              {dates.locationName && (
                <DataRow
                  label="Venue"
                  value={
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {dates.locationName}
                    </span>
                  }
                />
              )}
              {dates.locationAddress && (
                <DataRow label="Address" value={truncateText(dates.locationAddress, 50)} />
              )}
            </>
          )}
        </div>
      </Section>

      {/* Venues Section */}
      <Section
        title="Venues"
        icon={<Building2 className="h-5 w-5" />}
        stepName="venues"
        onEdit={handleEdit}
      >
        {Array.isArray(venues) && venues.length > 0 ? (
          <div className="space-y-3">
            {venues.map((venue) => (
              <div
                key={venue.id}
                className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium">{venue.name}</p>
                  {venue.capacity && (
                    <p className="text-sm text-muted-foreground">
                      Capacity: {venue.capacity}
                    </p>
                  )}
                  {Array.isArray(venue.features) && venue.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {venue.features.map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-background border"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No venues configured</p>
        )}
      </Section>

      {/* Schedule Section */}
      <Section
        title="Schedule"
        icon={<Clock className="h-5 w-5" />}
        stepName="schedule"
        onEdit={handleEdit}
      >
        {schedule.timeSlots.length > 0 ? (
          <div className="space-y-1">
            <DataRow label="Time Slots" value={`${schedule.timeSlots.length} slots configured`} />
            {/* Get unique dates from time slots */}
            {(() => {
              const datesSet = new Set(schedule.timeSlots.map((slot) => slot.dayDate));
              const uniqueDates = Array.from(datesSet).sort();
              if (uniqueDates.length > 0) {
                return (
                  <DataRow
                    label="Schedule Days"
                    value={`${uniqueDates.length} day${uniqueDates.length > 1 ? 's' : ''}`}
                  />
                );
              }
              return null;
            })()}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No schedule configured yet. You can add time slots after creating the event.
          </p>
        )}
      </Section>

      {/* Tracks Section */}
      <Section
        title="Tracks"
        icon={<Tag className="h-5 w-5" />}
        stepName="tracks"
        onEdit={handleEdit}
      >
        {Array.isArray(tracks) && tracks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tracks.map((track) => (
              <span
                key={track.id}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ backgroundColor: `${track.color}20`, color: track.color }}
              >
                <span
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: track.color }}
                />
                {track.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No tracks configured. Tracks help categorize sessions by topic.
          </p>
        )}
      </Section>

      {/* Voting Section */}
      <Section
        title="Voting Configuration"
        icon={<Vote className="h-5 w-5" />}
        stepName="voting"
        onEdit={handleEdit}
        isValid={isStepValid(state, 5)}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <DataRow label="Mechanism" value={VOTING_MECHANISM_LABELS[voting.mechanism] || voting.mechanism} />
            <DataRow label="Credits per User" value={voting.credits} />
            <DataRow label="Max Proposals" value={`${voting.maxProposalsPerUser} per user`} />
            <DataRow
              label="Require Approval"
              value={voting.requireProposalApproval ? 'Yes' : 'No'}
            />
          </div>

          {/* Proposal Window */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-2">Proposal Window</p>
            <div className="space-y-1">
              <DataRow label="Opens" value={formatDateTime(voting.proposalsOpenAt)} />
              <DataRow label="Closes" value={formatDateTime(voting.proposalsCloseAt)} />
            </div>
          </div>

          {/* Voting Window */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-2">Voting Window</p>
            <div className="space-y-1">
              <DataRow label="Opens" value={formatDateTime(voting.votingOpensAt)} />
              <DataRow label="Closes" value={formatDateTime(voting.votingClosesAt)} />
            </div>
          </div>

          {/* Allowed Formats */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-2">Allowed Formats</p>
            <div className="flex flex-wrap gap-1">
              {Array.isArray(voting.allowedFormats) && voting.allowedFormats.map((format) => (
                <span
                  key={format}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted"
                >
                  {FORMAT_LABELS[format] || format}
                </span>
              ))}
            </div>
          </div>

          {/* Allowed Durations */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-2">Allowed Durations</p>
            <div className="flex flex-wrap gap-1">
              {Array.isArray(voting.allowedDurations) && voting.allowedDurations.map((duration) => (
                <span
                  key={duration}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted"
                >
                  {duration} min
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Branding Section */}
      <Section
        title="Branding"
        icon={<Palette className="h-5 w-5" />}
        stepName="branding"
        onEdit={handleEdit}
      >
        <div className="space-y-4">
          {/* Images */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Logo</p>
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt="Event logo"
                  className="h-16 w-16 object-contain rounded-lg border"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">None</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Banner</p>
              {branding.bannerUrl ? (
                <img
                  src={branding.bannerUrl}
                  alt="Event banner"
                  className="h-16 w-32 object-cover rounded-lg border"
                />
              ) : (
                <div className="h-16 w-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">None</span>
                </div>
              )}
            </div>
          </div>

          {/* Theme Colors */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-2">Theme Colors</p>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div
                  className="w-8 h-8 rounded-full border shadow-sm"
                  style={{ backgroundColor: branding.theme.primary }}
                  title="Primary"
                />
                <div
                  className="w-8 h-8 rounded-full border shadow-sm"
                  style={{ backgroundColor: branding.theme.secondary }}
                  title="Secondary"
                />
                <div
                  className="w-8 h-8 rounded-full border shadow-sm"
                  style={{ backgroundColor: branding.theme.accent }}
                  title="Accent"
                />
              </div>
              <span className="text-sm text-muted-foreground">
                Mode: <span className="capitalize">{branding.theme.mode}</span>
              </span>
            </div>
            {/* Color gradient preview */}
            <div
              className="h-2 rounded-full mt-2"
              style={{
                background: `linear-gradient(to right, ${branding.theme.primary}, ${branding.theme.secondary}, ${branding.theme.accent})`,
              }}
            />
          </div>

          {/* Social Links */}
          {(branding.social.twitter || branding.social.telegram || branding.social.discord || branding.social.website) && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">Social Links</p>
              <div className="flex flex-wrap gap-2">
                {branding.social.twitter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted">
                    <ExternalLink className="h-3 w-3" />
                    Twitter
                  </span>
                )}
                {branding.social.telegram && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted">
                    <ExternalLink className="h-3 w-3" />
                    Telegram
                  </span>
                )}
                {branding.social.discord && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted">
                    <ExternalLink className="h-3 w-3" />
                    Discord
                  </span>
                )}
                {branding.social.website && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted">
                    <Globe className="h-3 w-3" />
                    Website
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Terms and Conditions */}
      <Card>
        <CardContent className="py-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div>
              <span className="font-medium">I agree to the terms and conditions</span>
              <p className="text-sm text-muted-foreground mt-0.5">
                By creating this event, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline" target="_blank">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary hover:underline" target="_blank">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Create Event Button */}
      <div className="pt-4">
        <Button
          size="lg"
          className="w-full text-lg py-6"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!allStepsValid || !termsAccepted || isSubmitting}
        >
          {isSubmitting ? 'Creating Event...' : 'Create Event'}
        </Button>
        {!allStepsValid && (
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center mt-2">
            Please complete all required fields before creating your event.
          </p>
        )}
        {allStepsValid && !termsAccepted && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            Please accept the terms and conditions to continue.
          </p>
        )}
      </div>
    </div>
  );
}

export default ReviewStep;
