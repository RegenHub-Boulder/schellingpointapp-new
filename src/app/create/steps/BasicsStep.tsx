'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { WizardState, WizardAction, EventType, EventVisibility } from '../useWizardState';

// ============================================================================
// Types
// ============================================================================

interface BasicsStepProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

// ============================================================================
// Constants
// ============================================================================

const EVENT_TYPES: { value: EventType; label: string; description: string }[] = [
  {
    value: 'unconference',
    label: 'Unconference',
    description: 'Participant-driven, open space format',
  },
  {
    value: 'hackathon',
    label: 'Hackathon',
    description: 'Building projects over a set time period',
  },
  {
    value: 'conference',
    label: 'Conference',
    description: 'Traditional talks and presentations',
  },
  {
    value: 'meetup',
    label: 'Meetup',
    description: 'Casual community gathering',
  },
];

const VISIBILITY_OPTIONS: { value: EventVisibility; label: string; description: string }[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can discover and join',
  },
  {
    value: 'unlisted',
    label: 'Unlisted',
    description: 'Only people with link can access',
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Invite only',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

// ============================================================================
// Component
// ============================================================================

export function BasicsStep({ state, dispatch }: BasicsStepProps) {
  const { basics } = state;

  // Track if user has manually edited the slug
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);

  // Initialize slugManuallyEdited based on whether slug differs from auto-generated
  React.useEffect(() => {
    if (basics.name && basics.slug) {
      const autoSlug = generateSlug(basics.name);
      if (basics.slug !== autoSlug) {
        setSlugManuallyEdited(true);
      }
    }
  }, []); // Only run once on mount

  // Handler for name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const updates: Partial<typeof basics> = { name: newName };

    // Auto-generate slug if it hasn't been manually edited
    if (!slugManuallyEdited) {
      updates.slug = generateSlug(newName);
    }

    dispatch({ type: 'UPDATE_BASICS', payload: updates });
  };

  // Handler for slug changes
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 50);

    setSlugManuallyEdited(true);
    dispatch({ type: 'UPDATE_BASICS', payload: { slug: newSlug } });
  };

  // Handler for simple field changes
  const handleFieldChange = (field: keyof typeof basics) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    dispatch({ type: 'UPDATE_BASICS', payload: { [field]: e.target.value } });
  };

  // Handler for event type selection
  const handleEventTypeChange = (eventType: EventType) => {
    dispatch({ type: 'UPDATE_BASICS', payload: { eventType } });
  };

  // Handler for visibility selection
  const handleVisibilityChange = (visibility: EventVisibility) => {
    dispatch({ type: 'UPDATE_BASICS', payload: { visibility } });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>
            Start with the basic information about your event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="name">
                Event Name <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {basics.name.length}/100
              </span>
            </div>
            <Input
              id="name"
              placeholder="Enter your event name"
              value={basics.name}
              onChange={handleNameChange}
              maxLength={100}
              error={state.validation.basics?.includes('Event name is required')}
            />
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tagline">Tagline</Label>
              <span className="text-xs text-muted-foreground">
                {basics.tagline.length}/200
              </span>
            </div>
            <Input
              id="tagline"
              placeholder="A short catchy description"
              value={basics.tagline}
              onChange={handleFieldChange('tagline')}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell people what your event is about..."
              value={basics.description}
              onChange={handleFieldChange('description')}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Markdown formatting is supported
            </p>
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="slug">
                Event URL <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {basics.slug.length}/50
              </span>
            </div>
            <Input
              id="slug"
              placeholder="your-event-name"
              value={basics.slug}
              onChange={handleSlugChange}
              maxLength={50}
              error={
                state.validation.basics?.includes('Event slug is required') ||
                state.validation.basics?.includes(
                  'Slug can only contain lowercase letters, numbers, and hyphens'
                )
              }
            />
            <p className="text-sm text-muted-foreground">
              Your event URL:{' '}
              <span className="font-mono text-foreground">
                schellingpoint.xyz/e/{basics.slug || 'your-event'}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Event Type */}
      <Card>
        <CardHeader>
          <CardTitle>Event Type</CardTitle>
          <CardDescription>
            What kind of event are you organizing?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleEventTypeChange(type.value)}
                className={cn(
                  'flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all',
                  'hover:border-primary/50 hover:bg-accent/50',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  basics.eventType === type.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
              >
                <span className="font-medium">{type.label}</span>
                <span className="text-sm text-muted-foreground">
                  {type.description}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>
            Control who can see and access your event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleVisibilityChange(option.value)}
                className={cn(
                  'flex items-center w-full p-4 rounded-lg border-2 text-left transition-all',
                  'hover:border-primary/50 hover:bg-accent/50',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  basics.visibility === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full border-2 mr-4 flex-shrink-0',
                    basics.visibility === option.value
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  )}
                >
                  {basics.visibility === option.value && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
                <div>
                  <span className="font-medium">{option.label}</span>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BasicsStep;
