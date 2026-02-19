'use client';

import { useReducer, useCallback } from 'react';
import type { EventVisibility } from '@/types/event';

// ============================================================================
// Types
// ============================================================================

export type EventType = 'unconference' | 'hackathon' | 'conference' | 'meetup';
export type LocationType = 'in-person' | 'virtual' | 'hybrid';
export type VotingMechanism = 'quadratic' | 'linear' | 'approval';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface WizardBasics {
  name: string;
  tagline: string;
  description: string;
  slug: string;
  eventType: EventType;
  visibility: EventVisibility;
}

export interface WizardDates {
  startDate: string; // ISO date
  endDate: string; // ISO date
  timezone: string; // IANA format
  locationName: string;
  locationAddress: string;
  locationType: LocationType;
}

export interface WizardVenue {
  id: string; // client-side id, not DB id
  name: string;
  capacity: number | null;
  features: string[];
  address: string;
}

export interface WizardTimeSlot {
  id: string; // client-side id
  venueId: string; // matches venues[].id
  dayDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  label: string;
  isBreak: boolean;
}

export interface WizardSchedule {
  timeSlots: WizardTimeSlot[];
}

export interface WizardTrack {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface WizardVoting {
  credits: number; // default 100
  mechanism: VotingMechanism;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
  proposalsOpenAt: string | null;
  proposalsCloseAt: string | null;
  maxProposalsPerUser: number;
  requireProposalApproval: boolean;
  allowedFormats: string[];
  allowedDurations: number[];
}

export interface WizardTheme {
  primary: string;
  secondary: string;
  accent: string;
  mode: ThemeMode;
}

export interface WizardSocial {
  twitter: string;
  telegram: string;
  discord: string;
  website: string;
}

export interface WizardBranding {
  logoUrl: string | null;
  bannerUrl: string | null;
  theme: WizardTheme;
  social: WizardSocial;
}

export interface WizardState {
  currentStep: number;
  basics: WizardBasics;
  dates: WizardDates;
  venues: WizardVenue[];
  schedule: WizardSchedule;
  tracks: WizardTrack[];
  voting: WizardVoting;
  branding: WizardBranding;
  validation: Record<string, string[]>; // step -> error messages
}

// ============================================================================
// Actions
// ============================================================================

export type WizardAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'UPDATE_BASICS'; payload: Partial<WizardBasics> }
  | { type: 'UPDATE_DATES'; payload: Partial<WizardDates> }
  | { type: 'ADD_VENUE'; payload: WizardVenue }
  | { type: 'UPDATE_VENUE'; payload: { id: string; updates: Partial<WizardVenue> } }
  | { type: 'REMOVE_VENUE'; payload: string }
  | { type: 'ADD_TRACK'; payload: WizardTrack }
  | { type: 'UPDATE_TRACK'; payload: { id: string; updates: Partial<WizardTrack> } }
  | { type: 'REMOVE_TRACK'; payload: string }
  | { type: 'ADD_TIME_SLOT'; payload: WizardTimeSlot }
  | { type: 'UPDATE_TIME_SLOT'; payload: { id: string; updates: Partial<WizardTimeSlot> } }
  | { type: 'REMOVE_TIME_SLOT'; payload: string }
  | { type: 'UPDATE_VOTING'; payload: Partial<WizardVoting> }
  | { type: 'UPDATE_BRANDING'; payload: Partial<WizardBranding> }
  | { type: 'SET_VALIDATION_ERRORS'; payload: { step: string; errors: string[] } }
  | { type: 'CLEAR_VALIDATION_ERRORS'; payload: string }
  | { type: 'RESET' }
  | { type: 'LOAD_STATE'; payload: Partial<WizardState> };

// ============================================================================
// Constants
// ============================================================================

export const WIZARD_STEPS = [
  'basics',
  'dates',
  'venues',
  'schedule',
  'tracks',
  'voting',
  'branding',
  'review',
] as const;

export type WizardStepName = (typeof WIZARD_STEPS)[number];

export const INITIAL_STATE: WizardState = {
  currentStep: 0,
  basics: {
    name: '',
    tagline: '',
    description: '',
    slug: '',
    eventType: 'unconference',
    visibility: 'public',
  },
  dates: {
    startDate: '',
    endDate: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locationName: '',
    locationAddress: '',
    locationType: 'in-person',
  },
  venues: [],
  schedule: {
    timeSlots: [],
  },
  tracks: [],
  voting: {
    credits: 100,
    mechanism: 'quadratic',
    votingOpensAt: null,
    votingClosesAt: null,
    proposalsOpenAt: null,
    proposalsCloseAt: null,
    maxProposalsPerUser: 3,
    requireProposalApproval: false,
    allowedFormats: ['talk', 'workshop', 'panel', 'discussion'],
    allowedDurations: [15, 30, 45, 60],
  },
  branding: {
    logoUrl: null,
    bannerUrl: null,
    theme: {
      primary: '#6366f1', // indigo-500
      secondary: '#8b5cf6', // violet-500
      accent: '#f59e0b', // amber-500
      mode: 'system',
    },
    social: {
      twitter: '',
      telegram: '',
      discord: '',
      website: '',
    },
  },
  validation: {},
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the step name from a step number
 */
export function getStepFromNumber(stepNumber: number): WizardStepName {
  if (stepNumber < 0 || stepNumber >= WIZARD_STEPS.length) {
    return WIZARD_STEPS[0];
  }
  return WIZARD_STEPS[stepNumber];
}

/**
 * Get the step number from a step name
 */
export function getNumberFromStep(stepName: WizardStepName): number {
  const index = WIZARD_STEPS.indexOf(stepName);
  return index >= 0 ? index : 0;
}

/**
 * Basic validation for each step
 * Returns true if the step is valid, false otherwise
 */
export function isStepValid(state: WizardState, step: number): boolean {
  const stepName = getStepFromNumber(step);

  switch (stepName) {
    case 'basics':
      return (
        state.basics.name.trim().length > 0 &&
        state.basics.slug.trim().length > 0 &&
        state.basics.eventType.length > 0
      );

    case 'dates':
      return (
        state.dates.startDate.length > 0 &&
        state.dates.endDate.length > 0 &&
        state.dates.timezone.length > 0 &&
        new Date(state.dates.startDate) <= new Date(state.dates.endDate)
      );

    case 'venues':
      // Venues are optional for virtual events
      if (state.dates.locationType === 'virtual') {
        return true;
      }
      // For in-person or hybrid, at least one venue is recommended but not strictly required
      return true;

    case 'schedule':
      // Schedule is optional, can be configured later
      return true;

    case 'tracks':
      // Tracks are optional
      return true;

    case 'voting':
      return (
        state.voting.credits > 0 &&
        state.voting.maxProposalsPerUser > 0 &&
        Array.isArray(state.voting.allowedFormats) &&
        state.voting.allowedFormats.length > 0 &&
        Array.isArray(state.voting.allowedDurations) &&
        state.voting.allowedDurations.length > 0
      );

    case 'branding':
      // Branding is optional, defaults are fine
      return true;

    case 'review':
      // Review step just needs all previous steps to be valid
      return true;

    default:
      return true;
  }
}

/**
 * Get validation errors for a specific step
 */
export function getStepValidationErrors(state: WizardState, step: number): string[] {
  const stepName = getStepFromNumber(step);
  const errors: string[] = [];

  switch (stepName) {
    case 'basics':
      if (!state.basics.name.trim()) {
        errors.push('Event name is required');
      }
      if (!state.basics.slug.trim()) {
        errors.push('Event slug is required');
      }
      if (state.basics.slug && !/^[a-z0-9-]+$/.test(state.basics.slug)) {
        errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
      }
      break;

    case 'dates':
      if (!state.dates.startDate) {
        errors.push('Start date is required');
      }
      if (!state.dates.endDate) {
        errors.push('End date is required');
      }
      if (
        state.dates.startDate &&
        state.dates.endDate &&
        new Date(state.dates.startDate) > new Date(state.dates.endDate)
      ) {
        errors.push('End date must be after start date');
      }
      if (!state.dates.timezone) {
        errors.push('Timezone is required');
      }
      break;

    case 'voting':
      if (state.voting.credits <= 0) {
        errors.push('Vote credits must be greater than 0');
      }
      if (state.voting.maxProposalsPerUser <= 0) {
        errors.push('Max proposals per user must be greater than 0');
      }
      if (!Array.isArray(state.voting.allowedFormats) || state.voting.allowedFormats.length === 0) {
        errors.push('At least one session format must be allowed');
      }
      if (!Array.isArray(state.voting.allowedDurations) || state.voting.allowedDurations.length === 0) {
        errors.push('At least one session duration must be allowed');
      }
      break;

    default:
      break;
  }

  return errors;
}

// ============================================================================
// Reducer
// ============================================================================

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: Math.max(0, Math.min(action.payload, WIZARD_STEPS.length - 1)),
      };

    case 'NEXT_STEP': {
      // Validate current step before allowing forward navigation
      const errors = getStepValidationErrors(state, state.currentStep);
      if (errors.length > 0) {
        const stepName = getStepFromNumber(state.currentStep);
        return {
          ...state,
          validation: {
            ...state.validation,
            [stepName]: errors,
          },
        };
      }
      // Clear validation errors for current step and move forward
      const currentStepName = getStepFromNumber(state.currentStep);
      const newValidation = { ...state.validation };
      delete newValidation[currentStepName];
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, WIZARD_STEPS.length - 1),
        validation: newValidation,
      };
    }

    case 'PREV_STEP':
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0),
      };

    case 'UPDATE_BASICS':
      return {
        ...state,
        basics: {
          ...state.basics,
          ...action.payload,
        },
      };

    case 'UPDATE_DATES':
      return {
        ...state,
        dates: {
          ...state.dates,
          ...action.payload,
        },
      };

    case 'ADD_VENUE':
      return {
        ...state,
        venues: [...state.venues, action.payload],
      };

    case 'UPDATE_VENUE':
      return {
        ...state,
        venues: state.venues.map((venue) =>
          venue.id === action.payload.id
            ? { ...venue, ...action.payload.updates }
            : venue
        ),
      };

    case 'REMOVE_VENUE': {
      const venueId = action.payload;
      return {
        ...state,
        venues: state.venues.filter((venue) => venue.id !== venueId),
        // Also remove time slots that reference this venue
        schedule: {
          ...state.schedule,
          timeSlots: state.schedule.timeSlots.filter(
            (slot) => slot.venueId !== venueId
          ),
        },
      };
    }

    case 'ADD_TRACK':
      return {
        ...state,
        tracks: [...state.tracks, action.payload],
      };

    case 'UPDATE_TRACK':
      return {
        ...state,
        tracks: state.tracks.map((track) =>
          track.id === action.payload.id
            ? { ...track, ...action.payload.updates }
            : track
        ),
      };

    case 'REMOVE_TRACK':
      return {
        ...state,
        tracks: state.tracks.filter((track) => track.id !== action.payload),
      };

    case 'ADD_TIME_SLOT':
      return {
        ...state,
        schedule: {
          ...state.schedule,
          timeSlots: [...state.schedule.timeSlots, action.payload],
        },
      };

    case 'UPDATE_TIME_SLOT':
      return {
        ...state,
        schedule: {
          ...state.schedule,
          timeSlots: state.schedule.timeSlots.map((slot) =>
            slot.id === action.payload.id
              ? { ...slot, ...action.payload.updates }
              : slot
          ),
        },
      };

    case 'REMOVE_TIME_SLOT':
      return {
        ...state,
        schedule: {
          ...state.schedule,
          timeSlots: state.schedule.timeSlots.filter(
            (slot) => slot.id !== action.payload
          ),
        },
      };

    case 'UPDATE_VOTING':
      return {
        ...state,
        voting: {
          ...state.voting,
          ...action.payload,
        },
      };

    case 'UPDATE_BRANDING': {
      // Handle nested updates for theme and social
      const newBranding = { ...state.branding };

      if (action.payload.theme) {
        newBranding.theme = {
          ...state.branding.theme,
          ...action.payload.theme,
        };
      }

      if (action.payload.social) {
        newBranding.social = {
          ...state.branding.social,
          ...action.payload.social,
        };
      }

      if (action.payload.logoUrl !== undefined) {
        newBranding.logoUrl = action.payload.logoUrl;
      }

      if (action.payload.bannerUrl !== undefined) {
        newBranding.bannerUrl = action.payload.bannerUrl;
      }

      return {
        ...state,
        branding: newBranding,
      };
    }

    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        validation: {
          ...state.validation,
          [action.payload.step]: action.payload.errors,
        },
      };

    case 'CLEAR_VALIDATION_ERRORS': {
      const newValidation = { ...state.validation };
      delete newValidation[action.payload];
      return {
        ...state,
        validation: newValidation,
      };
    }

    case 'RESET':
      return INITIAL_STATE;

    case 'LOAD_STATE':
      return {
        ...INITIAL_STATE,
        ...action.payload,
        // Ensure nested objects are properly merged
        basics: {
          ...INITIAL_STATE.basics,
          ...action.payload.basics,
        },
        dates: {
          ...INITIAL_STATE.dates,
          ...action.payload.dates,
        },
        schedule: {
          ...INITIAL_STATE.schedule,
          ...action.payload.schedule,
        },
        voting: {
          ...INITIAL_STATE.voting,
          ...action.payload.voting,
        },
        branding: {
          ...INITIAL_STATE.branding,
          ...action.payload.branding,
          theme: {
            ...INITIAL_STATE.branding.theme,
            ...action.payload.branding?.theme,
          },
          social: {
            ...INITIAL_STATE.branding.social,
            ...action.payload.branding?.social,
          },
        },
        // Keep validation empty on load
        validation: {},
      };

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useWizardState(initialState?: Partial<WizardState>) {
  const [state, dispatch] = useReducer(
    wizardReducer,
    initialState
      ? {
          ...INITIAL_STATE,
          ...initialState,
          basics: { ...INITIAL_STATE.basics, ...initialState.basics },
          dates: { ...INITIAL_STATE.dates, ...initialState.dates },
          schedule: { ...INITIAL_STATE.schedule, ...initialState.schedule },
          voting: { ...INITIAL_STATE.voting, ...initialState.voting },
          branding: {
            ...INITIAL_STATE.branding,
            ...initialState.branding,
            theme: {
              ...INITIAL_STATE.branding.theme,
              ...initialState.branding?.theme,
            },
            social: {
              ...INITIAL_STATE.branding.social,
              ...initialState.branding?.social,
            },
          },
        }
      : INITIAL_STATE
  );

  // Convenience methods
  const goToStep = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const loadState = useCallback((newState: Partial<WizardState>) => {
    dispatch({ type: 'LOAD_STATE', payload: newState });
  }, []);

  return {
    state,
    dispatch,
    // Convenience methods
    goToStep,
    nextStep,
    prevStep,
    reset,
    loadState,
    // Computed values
    currentStepName: getStepFromNumber(state.currentStep),
    isFirstStep: state.currentStep === 0,
    isLastStep: state.currentStep === WIZARD_STEPS.length - 1,
    isCurrentStepValid: isStepValid(state, state.currentStep),
    currentStepErrors: state.validation[getStepFromNumber(state.currentStep)] || [],
  };
}

// Re-export visibility type for convenience
export type { EventVisibility };
