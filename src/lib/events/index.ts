import { createClient } from '@/lib/supabase/server';
import type { Event, EventRow, EventMember } from '@/types/event';
import { transformEventRow } from '@/types/event';

/**
 * Get event by slug (server-side)
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return transformEventRow(data as EventRow);
}

/**
 * Get event by ID (server-side)
 */
export async function getEventById(id: string): Promise<Event | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
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
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('visibility', ['public', 'unlisted'])
    .order('start_date', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => transformEventRow(row as EventRow));
}
