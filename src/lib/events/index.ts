import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Event, EventRow, EventMember } from '@/types/event';
import { transformEventRow } from '@/types/event';

// Re-export date and timezone utilities
export * from './dates';
export * from './timezone';
export * from './lifecycle';
export * from './templates';

/**
 * Get event by slug (server-side)
 * Uses admin client to bypass RLS - this is safe because:
 * 1. This runs server-side only
 * 2. Public/unlisted events should be viewable by anyone
 * 3. Private events have their own access control in the UI layer
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  // Use admin client to ensure we can always fetch events server-side
  // Access control for private events is handled at the UI/page level
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('[getEventBySlug] Error fetching event:', error.message, { slug });
    return null;
  }

  if (!data) {
    console.warn('[getEventBySlug] No event found for slug:', slug);
    return null;
  }

  return transformEventRow(data as EventRow);
}

/**
 * Get event by ID (server-side)
 */
export async function getEventById(id: string): Promise<Event | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getEventById] Error fetching event:', error.message, { id });
    return null;
  }

  if (!data) {
    return null;
  }

  return transformEventRow(data as EventRow);
}

/**
 * Get user's membership for an event
 */
export async function getEventMembership(
  eventId: string,
  userId: string
): Promise<EventMember | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('event_members')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    eventId: data.event_id,
    userId: data.user_id,
    role: data.role,
    voteCredits: data.vote_credits,
    joinedAt: new Date(data.joined_at),
  };
}

/**
 * Get all public/unlisted events (for discovery)
 */
export async function getPublicEvents(): Promise<Event[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('visibility', ['public', 'unlisted'])
    .order('start_date', { ascending: false });

  if (error) {
    console.error('[getPublicEvents] Error fetching events:', error.message);
    return [];
  }

  if (!data) {
    return [];
  }

  return data.map((row) => transformEventRow(row as EventRow));
}
