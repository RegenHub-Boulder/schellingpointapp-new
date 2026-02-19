'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { WizardState, WizardAction, VotingMechanism } from '../useWizardState';

// ============================================================================
// Types
// ============================================================================

interface VotingStepProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

// ============================================================================
// Constants
// ============================================================================

const VOTING_MECHANISMS: {
  value: VotingMechanism;
  label: string;
  description: string;
}[] = [
  {
    value: 'quadratic',
    label: 'Quadratic',
    description:
      'Cost increases quadratically. 1 vote = 1 credit, 2 votes = 4 credits, 3 votes = 9 credits. Encourages broad support.',
  },
  {
    value: 'linear',
    label: 'Linear',
    description: '1 vote = 1 credit. Simple and straightforward.',
  },
  {
    value: 'approval',
    label: 'Approval',
    description: 'Unlimited votes per session. Good for preference collection.',
  },
];

const SESSION_FORMATS: { value: string; label: string }[] = [
  { value: 'talk', label: 'Talk' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'panel', label: 'Panel' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'lightning', label: 'Lightning Talk' },
  { value: 'demo', label: 'Demo' },
  { value: 'keynote', label: 'Keynote' },
  { value: 'networking', label: 'Networking' },
];

const SESSION_DURATIONS: { value: number; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '120 min' },
];

// ============================================================================
// Component
// ============================================================================

export function VotingStep({ state, dispatch }: VotingStepProps) {
  const { voting } = state;

  // Handler for updating voting fields
  const handleVotingChange = (updates: Partial<typeof voting>) => {
    dispatch({ type: 'UPDATE_VOTING', payload: updates });
  };

  // Handler for number inputs
  const handleNumberChange =
    (field: 'credits' | 'maxProposalsPerUser') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value >= 0) {
        handleVotingChange({ [field]: value });
      }
    };

  // Handler for datetime inputs
  const handleDatetimeChange =
    (field: 'votingOpensAt' | 'votingClosesAt' | 'proposalsOpenAt' | 'proposalsCloseAt') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Convert empty string to null, otherwise store ISO datetime
      handleVotingChange({ [field]: value || null });
    };

  // Handler for voting mechanism selection
  const handleMechanismChange = (mechanism: VotingMechanism) => {
    handleVotingChange({ mechanism });
  };

  // Handler for format checkbox toggle
  const handleFormatToggle = (format: string) => {
    const currentFormats = voting.allowedFormats;
    const newFormats = currentFormats.includes(format)
      ? currentFormats.filter((f) => f !== format)
      : [...currentFormats, format];
    handleVotingChange({ allowedFormats: newFormats });
  };

  // Handler for duration checkbox toggle
  const handleDurationToggle = (duration: number) => {
    const currentDurations = voting.allowedDurations;
    const newDurations = currentDurations.includes(duration)
      ? currentDurations.filter((d) => d !== duration)
      : [...currentDurations, duration];
    handleVotingChange({ allowedDurations: newDurations });
  };

  // Handler for proposal approval toggle
  const handleApprovalToggle = () => {
    handleVotingChange({ requireProposalApproval: !voting.requireProposalApproval });
  };

  return (
    <div className="space-y-6">
      {/* Vote Credits */}
      <Card>
        <CardHeader>
          <CardTitle>Vote Credits</CardTitle>
          <CardDescription>
            Each attendee receives this many credits to allocate across sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="credits">Credits per Attendee</Label>
            <Input
              id="credits"
              type="number"
              min={1}
              value={voting.credits}
              onChange={handleNumberChange('credits')}
              className="max-w-[200px]"
              error={state.validation.voting?.includes('Vote credits must be greater than 0')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Voting Mechanism */}
      <Card>
        <CardHeader>
          <CardTitle>Voting Mechanism</CardTitle>
          <CardDescription>
            Choose how votes are counted and credits are spent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {VOTING_MECHANISMS.map((mechanism) => (
              <button
                key={mechanism.value}
                type="button"
                onClick={() => handleMechanismChange(mechanism.value)}
                className={cn(
                  'flex items-start w-full p-4 rounded-lg border-2 text-left transition-all',
                  'hover:border-primary/50 hover:bg-accent/50',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  voting.mechanism === mechanism.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full border-2 mr-4 mt-0.5 flex-shrink-0',
                    voting.mechanism === mechanism.value
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  )}
                >
                  {voting.mechanism === mechanism.value && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
                <div>
                  <span className="font-medium">{mechanism.label}</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mechanism.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Proposal Window */}
      <Card>
        <CardHeader>
          <CardTitle>Proposal Window</CardTitle>
          <CardDescription>
            When can attendees submit session proposals?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proposalsOpenAt">Opens At</Label>
              <Input
                id="proposalsOpenAt"
                type="datetime-local"
                value={voting.proposalsOpenAt || ''}
                onChange={handleDatetimeChange('proposalsOpenAt')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposalsCloseAt">Closes At</Label>
              <Input
                id="proposalsCloseAt"
                type="datetime-local"
                value={voting.proposalsCloseAt || ''}
                onChange={handleDatetimeChange('proposalsCloseAt')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voting Window */}
      <Card>
        <CardHeader>
          <CardTitle>Voting Window</CardTitle>
          <CardDescription>
            When can attendees vote on sessions? Typically opens after proposals close.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="votingOpensAt">Opens At</Label>
              <Input
                id="votingOpensAt"
                type="datetime-local"
                value={voting.votingOpensAt || ''}
                onChange={handleDatetimeChange('votingOpensAt')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="votingClosesAt">Closes At</Label>
              <Input
                id="votingClosesAt"
                type="datetime-local"
                value={voting.votingClosesAt || ''}
                onChange={handleDatetimeChange('votingClosesAt')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposal Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Proposal Settings</CardTitle>
          <CardDescription>
            Configure how session proposals work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Proposals Per User */}
          <div className="space-y-2">
            <Label htmlFor="maxProposals">Max Proposals Per User</Label>
            <Input
              id="maxProposals"
              type="number"
              min={1}
              value={voting.maxProposalsPerUser}
              onChange={handleNumberChange('maxProposalsPerUser')}
              className="max-w-[200px]"
              error={state.validation.voting?.includes(
                'Max proposals per user must be greater than 0'
              )}
            />
            <p className="text-sm text-muted-foreground">
              How many sessions can each person propose?
            </p>
          </div>

          {/* Require Proposal Approval */}
          <div className="flex items-start space-x-3">
            <button
              type="button"
              role="switch"
              aria-checked={voting.requireProposalApproval}
              onClick={handleApprovalToggle}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                voting.requireProposalApproval ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out',
                  voting.requireProposalApproval ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
            <div className="space-y-1">
              <Label className="cursor-pointer" onClick={handleApprovalToggle}>
                Require Admin Approval
              </Label>
              <p className="text-sm text-muted-foreground">
                Require admin approval before proposals appear for voting
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allowed Formats */}
      <Card>
        <CardHeader>
          <CardTitle>Allowed Session Formats</CardTitle>
          <CardDescription>
            What types of sessions can attendees propose?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SESSION_FORMATS.map((format) => {
              const isSelected = voting.allowedFormats.includes(format.value);
              return (
                <button
                  key={format.value}
                  type="button"
                  onClick={() => handleFormatToggle(format.value)}
                  className={cn(
                    'flex items-center p-3 rounded-lg border-2 transition-all',
                    'hover:border-primary/50 hover:bg-accent/50',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-5 h-5 rounded border-2 mr-3 flex-shrink-0',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    )}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium">{format.label}</span>
                </button>
              );
            })}
          </div>
          {state.validation.voting?.includes(
            'At least one session format must be allowed'
          ) && (
            <p className="text-sm text-destructive mt-2">
              Please select at least one session format
            </p>
          )}
        </CardContent>
      </Card>

      {/* Allowed Durations */}
      <Card>
        <CardHeader>
          <CardTitle>Allowed Session Durations</CardTitle>
          <CardDescription>
            What session lengths are available for proposals?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {SESSION_DURATIONS.map((duration) => {
              const isSelected = voting.allowedDurations.includes(duration.value);
              return (
                <button
                  key={duration.value}
                  type="button"
                  onClick={() => handleDurationToggle(duration.value)}
                  className={cn(
                    'flex items-center justify-center p-3 rounded-lg border-2 transition-all',
                    'hover:border-primary/50 hover:bg-accent/50',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-5 h-5 rounded border-2 mr-2 flex-shrink-0',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    )}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium">{duration.label}</span>
                </button>
              );
            })}
          </div>
          {state.validation.voting?.includes(
            'At least one session duration must be allowed'
          ) && (
            <p className="text-sm text-destructive mt-2">
              Please select at least one session duration
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default VotingStep;
