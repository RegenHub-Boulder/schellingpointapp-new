import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/api/getUser';
import { isValidSlugFormat, suggestAlternativeSlugs } from '@/lib/utils/slug';
import { parseTimeInTimezone } from '@/lib/events/timezone';
import type { WizardState, WizardVenue, WizardTrack, WizardTimeSlot } from '@/app/create/useWizardState';
import type { EventRow, EventTheme } from '@/types/event';

// ============================================================================
// Types
// ============================================================================

interface CreateEventRequest {
  wizardState: WizardState;
}

interface CreateEventResponse {
  success: boolean;
  event?: Partial<EventRow>;
  eventSlug?: string;
  error?: string;
  suggestions?: string[];
}

interface VenueIdMapping {
  [clientId: string]: string; // maps client-side ID to database UUID
}

// ============================================================================
// Validation
// ============================================================================

function validateWizardState(state: WizardState): { valid: boolean; error?: string } {
  // Basics validation
  if (!state.basics.name?.trim()) {
    return { valid: false, error: 'Event name is required' };
  }
  if (!state.basics.slug?.trim()) {
    return { valid: false, error: 'Event slug is required' };
  }
  const slugValidation = isValidSlugFormat(state.basics.slug);
  if (!slugValidation.valid) {
    return { valid: false, error: slugValidation.error };
  }

  // Dates validation
  if (!state.dates.startDate) {
    return { valid: false, error: 'Start date is required' };
  }
  if (!state.dates.endDate) {
    return { valid: false, error: 'End date is required' };
  }
  if (new Date(state.dates.startDate) > new Date(state.dates.endDate)) {
    return { valid: false, error: 'End date must be after start date' };
  }
  if (!state.dates.timezone) {
    return { valid: false, error: 'Timezone is required' };
  }

  // Voting validation
  if (state.voting.credits <= 0) {
    return { valid: false, error: 'Vote credits must be greater than 0' };
  }
  if (state.voting.maxProposalsPerUser <= 0) {
    return { valid: false, error: 'Max proposals per user must be greater than 0' };
  }
  if (!state.voting.allowedFormats?.length) {
    return { valid: false, error: 'At least one session format must be allowed' };
  }
  if (!state.voting.allowedDurations?.length) {
    return { valid: false, error: 'At least one session duration must be allowed' };
  }

  return { valid: true };
}

// ============================================================================
// Data Transformations
// ============================================================================

/**
 * Transform wizard state to events table insert
 */
function transformToEventInsert(
  state: WizardState,
  userId: string
): Omit<EventRow, 'id' | 'created_at' | 'updated_at' | 'location_geo'> & { created_by: string } {
  // Build theme JSON from branding
  const theme: EventTheme = {
    colors: {
      primary: state.branding.theme.primary,
      secondary: state.branding.theme.secondary,
      accent: state.branding.theme.accent,
    },
    mode: state.branding.theme.mode,
    social: {
      twitter: state.branding.social.twitter || undefined,
      telegram: state.branding.social.telegram || undefined,
      discord: state.branding.social.discord || undefined,
      website: state.branding.social.website || undefined,
    },
  };

  return {
    slug: state.basics.slug,
    name: state.basics.name,
    tagline: state.basics.tagline || null,
    description: state.basics.description || null,

    start_date: state.dates.startDate,
    end_date: state.dates.endDate,
    timezone: state.dates.timezone,
    location_name: state.dates.locationName || null,
    location_address: state.dates.locationAddress || null,

    status: 'draft',

    vote_credits_per_user: state.voting.credits,
    voting_opens_at: state.voting.votingOpensAt || null,
    voting_closes_at: state.voting.votingClosesAt || null,
    proposals_open_at: state.voting.proposalsOpenAt || null,
    proposals_close_at: state.voting.proposalsCloseAt || null,

    allowed_formats: state.voting.allowedFormats,
    allowed_durations: state.voting.allowedDurations,
    max_proposals_per_user: state.voting.maxProposalsPerUser,
    require_proposal_approval: state.voting.requireProposalApproval,

    max_attendees: null,

    theme,
    logo_url: state.branding.logoUrl || null,
    banner_url: state.branding.bannerUrl || null,
    favicon_url: null,

    created_by: userId,
    is_featured: false,
    visibility: state.basics.visibility,
    schedule_published_at: null,
    last_schedule_change_at: null,
  };
}

/**
 * Transform wizard venues to venues table inserts
 */
function transformVenuesToInsert(
  venues: WizardVenue[],
  eventId: string
): Array<{
  name: string;
  capacity: number | null;
  features: string[];
  address: string | null;
  event_id: string;
  slug: string;
}> {
  return venues.map((venue, index) => ({
    name: venue.name,
    capacity: venue.capacity,
    features: venue.features,
    address: venue.address || null,
    event_id: eventId,
    // Generate a slug from the venue name
    slug: venue.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `venue-${index + 1}`,
  }));
}

/**
 * Transform wizard tracks to tracks table inserts
 */
function transformTracksToInsert(
  tracks: WizardTrack[],
  eventId: string
): Array<{
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  event_id: string;
  display_order: number;
  is_active: boolean;
}> {
  return tracks.map((track, index) => ({
    name: track.name,
    slug: track.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `track-${index + 1}`,
    description: track.description || null,
    color: track.color || null,
    event_id: eventId,
    display_order: index,
    is_active: true,
  }));
}

/**
 * Transform wizard time slots to time_slots table inserts
 */
function transformTimeSlotsToInsert(
  timeSlots: WizardTimeSlot[],
  eventId: string,
  venueIdMapping: VenueIdMapping,
  eventTimezone: string
): Array<{
  start_time: string;
  end_time: string;
  label: string | null;
  is_break: boolean;
  event_id: string;
  venue_id: string | null;
  day_date: string;
  slot_type: string;
}> {
  return timeSlots.map((slot) => {
    // Convert local times in event timezone to proper UTC timestamps
    const startDate = parseTimeInTimezone(slot.startTime, slot.dayDate, eventTimezone);
    const endDate = parseTimeInTimezone(slot.endTime, slot.dayDate, eventTimezone);

    return {
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      label: slot.label || null,
      is_break: slot.isBreak,
      event_id: eventId,
      venue_id: venueIdMapping[slot.venueId] || null,
      day_date: slot.dayDate,
      slot_type: slot.isBreak ? 'break' : 'session',
    };
  });
}

// ============================================================================
// POST /api/events/create
// ============================================================================

export async function POST(request: Request): Promise<NextResponse<CreateEventResponse>> {
  try {
    // 1. Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body: CreateEventRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { wizardState } = body;
    if (!wizardState) {
      return NextResponse.json(
        { success: false, error: 'wizardState is required' },
        { status: 400 }
      );
    }

    // 3. Validate wizard state
    const validation = validateWizardState(wizardState);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // 4. Check slug uniqueness
    const supabase = await createAdminClient();
    const { data: existingEvent, error: slugCheckError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', wizardState.basics.slug)
      .maybeSingle();

    if (slugCheckError) {
      console.error('Error checking slug:', slugCheckError);
      return NextResponse.json(
        { success: false, error: 'Failed to check slug availability' },
        { status: 500 }
      );
    }

    if (existingEvent) {
      const suggestions = suggestAlternativeSlugs(wizardState.basics.slug);
      // Verify suggestions are available
      const { data: takenSlugs } = await supabase
        .from('events')
        .select('slug')
        .in('slug', suggestions);

      const takenSet = new Set(takenSlugs?.map(e => e.slug) ?? []);
      const availableSuggestions = suggestions.filter(s => !takenSet.has(s));

      return NextResponse.json(
        {
          success: false,
          error: 'This event URL is already taken',
          suggestions: availableSuggestions.slice(0, 3),
        },
        { status: 409 }
      );
    }

    // 5. Create the event
    const eventInsert = transformToEventInsert(wizardState, user.id);
    const { data: createdEvent, error: eventError } = await supabase
      .from('events')
      .insert(eventInsert)
      .select('id, slug, name')
      .single();

    if (eventError || !createdEvent) {
      console.error('Error creating event:', eventError);
      return NextResponse.json(
        { success: false, error: 'Failed to create event' },
        { status: 500 }
      );
    }

    const eventId = createdEvent.id;

    // 6. Create venues (if any)
    let venueIdMapping: VenueIdMapping = {};
    if (wizardState.venues.length > 0) {
      const venueInserts = transformVenuesToInsert(wizardState.venues, eventId);
      const { data: createdVenues, error: venuesError } = await supabase
        .from('venues')
        .insert(venueInserts)
        .select('id, slug');

      if (venuesError) {
        console.error('Error creating venues:', venuesError);
        // Event was created but venues failed - log but continue
        // The event creator can add venues later
      } else if (createdVenues) {
        // Create mapping from client-side venue IDs to database IDs
        // We match by index since we inserted in the same order
        wizardState.venues.forEach((clientVenue, index) => {
          if (createdVenues[index]) {
            venueIdMapping[clientVenue.id] = createdVenues[index].id;
          }
        });
      }
    }

    // 7. Create tracks (if any)
    if (wizardState.tracks.length > 0) {
      const trackInserts = transformTracksToInsert(wizardState.tracks, eventId);
      const { error: tracksError } = await supabase
        .from('tracks')
        .insert(trackInserts);

      if (tracksError) {
        console.error('Error creating tracks:', tracksError);
        // Event was created but tracks failed - log but continue
      }
    }

    // 8. Create time slots (if any)
    if (wizardState.schedule.timeSlots.length > 0) {
      const timeSlotInserts = transformTimeSlotsToInsert(
        wizardState.schedule.timeSlots,
        eventId,
        venueIdMapping,
        wizardState.dates.timezone
      );
      const { error: slotsError } = await supabase
        .from('time_slots')
        .insert(timeSlotInserts);

      if (slotsError) {
        console.error('Error creating time slots:', slotsError);
        // Event was created but time slots failed - log but continue
      }
    }

    // 9. Add creator as event owner
    const { error: memberError } = await supabase
      .from('event_members')
      .insert({
        event_id: eventId,
        user_id: user.id,
        role: 'owner',
        vote_credits: wizardState.voting.credits,
      });

    if (memberError) {
      console.error('Error adding event owner:', memberError);
      // This is more critical - but event was created
      // The user will still be able to access via created_by
    }

    // 10. Return success
    return NextResponse.json({
      success: true,
      event: createdEvent,
      eventSlug: createdEvent.slug,
    });

  } catch (error) {
    console.error('Error in event creation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Other Methods
// ============================================================================

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
