/**
 * Event Templates
 *
 * Pre-configured templates for common event types.
 * Each template provides sensible defaults that can be customized by the user.
 */

import type {
  WizardState,
  WizardVenue,
  WizardTrack,
  WizardVoting,
  WizardBasics,
} from '@/app/create/useWizardState';

// ============================================================================
// Types
// ============================================================================

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  defaults: Partial<WizardState>;
}

// ============================================================================
// Helper: Generate unique IDs for template items
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Template Definitions
// ============================================================================

/**
 * Unconference Classic Template
 *
 * A participant-driven event where attendees propose and vote on sessions.
 * Features open proposals, quadratic voting, and diverse session formats.
 */
const unconferenceClassicDefaults: Partial<WizardState> = {
  basics: {
    eventType: 'unconference',
  } as Partial<WizardBasics> as WizardBasics,
  tracks: [
    {
      id: generateId('track'),
      name: 'Main Stage',
      color: '#6366f1', // indigo
      description: 'Primary venue for keynotes and featured sessions',
    },
    {
      id: generateId('track'),
      name: 'Workshop Room',
      color: '#10b981', // emerald
      description: 'Hands-on workshops and interactive sessions',
    },
    {
      id: generateId('track'),
      name: 'Open Space',
      color: '#f59e0b', // amber
      description: 'Flexible space for spontaneous discussions and breakouts',
    },
  ] as WizardTrack[],
  voting: {
    credits: 100,
    mechanism: 'quadratic',
    maxProposalsPerUser: 3,
    requireProposalApproval: false,
    allowedFormats: ['talk', 'workshop', 'discussion', 'lightning'],
    allowedDurations: [15, 30, 45, 60],
  } as Partial<WizardVoting> as WizardVoting,
};

/**
 * Curated Conference Template
 *
 * A traditional conference with curated content and speaker approval.
 * Features curated proposals, less participatory voting, and formal session types.
 */
const curatedConferenceDefaults: Partial<WizardState> = {
  basics: {
    eventType: 'conference',
  } as Partial<WizardBasics> as WizardBasics,
  tracks: [
    {
      id: generateId('track'),
      name: 'Keynotes',
      color: '#8b5cf6', // violet
      description: 'Featured speakers and opening/closing ceremonies',
    },
    {
      id: generateId('track'),
      name: 'Technical',
      color: '#3b82f6', // blue
      description: 'Deep-dive technical sessions and presentations',
    },
    {
      id: generateId('track'),
      name: 'Business',
      color: '#14b8a6', // teal
      description: 'Strategy, operations, and business-focused content',
    },
  ] as WizardTrack[],
  voting: {
    credits: 50,
    mechanism: 'quadratic',
    maxProposalsPerUser: 2,
    requireProposalApproval: true,
    allowedFormats: ['talk', 'panel', 'keynote'],
    allowedDurations: [30, 45, 60, 90],
  } as Partial<WizardVoting> as WizardVoting,
};

/**
 * Hackathon Template
 *
 * A fast-paced event focused on building and demos.
 * Features short session formats, demo-oriented tracks, and open participation.
 */
const hackathonDefaults: Partial<WizardState> = {
  basics: {
    eventType: 'hackathon',
  } as Partial<WizardBasics> as WizardBasics,
  tracks: [
    {
      id: generateId('track'),
      name: 'Demos',
      color: '#ef4444', // red
      description: 'Project demonstrations and presentations',
    },
    {
      id: generateId('track'),
      name: 'Workshops',
      color: '#22c55e', // green
      description: 'Technical workshops and learning sessions',
    },
    {
      id: generateId('track'),
      name: 'Judging',
      color: '#eab308', // yellow
      description: 'Judging sessions and awards ceremonies',
    },
  ] as WizardTrack[],
  voting: {
    credits: 100,
    mechanism: 'quadratic',
    maxProposalsPerUser: 5,
    requireProposalApproval: false,
    allowedFormats: ['demo', 'workshop', 'lightning'],
    allowedDurations: [5, 10, 15, 30],
  } as Partial<WizardVoting> as WizardVoting,
};

/**
 * Community Meetup Template
 *
 * A casual community gathering with simple structure.
 * Features minimal complexity, single track, and shorter sessions.
 */
const communityMeetupDefaults: Partial<WizardState> = {
  basics: {
    eventType: 'meetup',
  } as Partial<WizardBasics> as WizardBasics,
  tracks: [
    {
      id: generateId('track'),
      name: 'Main Room',
      color: '#06b6d4', // cyan
      description: 'Primary space for all sessions and discussions',
    },
  ] as WizardTrack[],
  voting: {
    credits: 50,
    mechanism: 'quadratic',
    maxProposalsPerUser: 2,
    requireProposalApproval: false,
    allowedFormats: ['talk', 'discussion'],
    allowedDurations: [15, 30, 45],
  } as Partial<WizardVoting> as WizardVoting,
};

// ============================================================================
// Template Registry
// ============================================================================

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'unconference-classic',
    name: 'Unconference Classic',
    description:
      'A participant-driven event where attendees propose and vote on sessions. Perfect for community gatherings and collaborative learning.',
    icon: 'Users',
    defaults: unconferenceClassicDefaults,
  },
  {
    id: 'curated-conference',
    name: 'Curated Conference',
    description:
      'A traditional conference with curated content and speaker approval. Ideal for professional events with invited speakers.',
    icon: 'Presentation',
    defaults: curatedConferenceDefaults,
  },
  {
    id: 'hackathon',
    name: 'Hackathon',
    description:
      'A fast-paced event focused on building and demos. Great for coding competitions, build weeks, and innovation sprints.',
    icon: 'Code',
    defaults: hackathonDefaults,
  },
  {
    id: 'community-meetup',
    name: 'Community Meetup',
    description:
      'A casual community gathering with simple structure. Perfect for regular meetups, social events, and informal gatherings.',
    icon: 'Coffee',
    defaults: communityMeetupDefaults,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a template by its ID
 */
export function getTemplateById(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find((template) => template.id === id);
}

/**
 * Apply a template to a base wizard state
 *
 * Performs a deep merge of the template defaults with the base state,
 * preserving any existing values in the base state while applying
 * template defaults for missing fields.
 */
export function applyTemplate(
  template: EventTemplate,
  baseState: WizardState
): WizardState {
  const { defaults } = template;

  // Generate fresh IDs for tracks to avoid conflicts
  const tracksWithFreshIds = defaults.tracks
    ? defaults.tracks.map((track) => ({
        ...track,
        id: generateId('track'),
      }))
    : baseState.tracks;

  // Generate fresh IDs for venues if present
  const venuesWithFreshIds = defaults.venues
    ? defaults.venues.map((venue) => ({
        ...venue,
        id: generateId('venue'),
      }))
    : baseState.venues;

  return {
    ...baseState,
    // Merge basics
    basics: {
      ...baseState.basics,
      ...defaults.basics,
    },
    // Merge dates
    dates: {
      ...baseState.dates,
      ...defaults.dates,
    },
    // Replace venues (with fresh IDs)
    venues: venuesWithFreshIds,
    // Merge schedule
    schedule: {
      ...baseState.schedule,
      ...defaults.schedule,
    },
    // Replace tracks (with fresh IDs)
    tracks: tracksWithFreshIds,
    // Merge voting settings
    voting: {
      ...baseState.voting,
      ...defaults.voting,
    },
    // Merge branding
    branding: {
      ...baseState.branding,
      ...defaults.branding,
      theme: {
        ...baseState.branding.theme,
        ...defaults.branding?.theme,
      },
      social: {
        ...baseState.branding.social,
        ...defaults.branding?.social,
      },
    },
    // Keep validation empty when applying template
    validation: {},
  };
}

// ============================================================================
// Type exports for convenience
// ============================================================================

export type { WizardState, WizardVenue, WizardTrack };
