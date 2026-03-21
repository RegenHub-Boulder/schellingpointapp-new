import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import AdminAnalyticsClient from './AdminAnalyticsClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  
  if (!event) {
    return { title: 'Analytics Not Found' }
  }

  return {
    title: `Analytics | ${event.name}`,
    description: `Analytics for ${event.name}`,
  }
}

export default async function AdminAnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  
  if (!event) {
    notFound()
  }

  const supabase = await createClient()

  const [sessionsRes, tracksRes, membersRes, votesRes, timeSlotsRes, venuesRes] = await Promise.all([
    supabase.from('sessions').select('id,status,total_votes,track_id,venue_id,time_slot_id,format,created_at').eq('event_id', event.id),
    supabase.from('tracks').select('id,name,color').eq('event_id', event.id),
    supabase.from('event_members').select('id,role,joined_at').eq('event_id', event.id),
    supabase.from('votes').select('id,credits_spent,user_id').eq('event_id', event.id),
    supabase.from('time_slots').select('id,is_break,venue_id').eq('event_id', event.id),
    supabase.from('venues').select('id,name,capacity').eq('event_id', event.id),
  ])

  const initialSessions = sessionsRes.data || []
  const initialTracks = tracksRes.data || []
  const initialMembers = membersRes.data || []
  const initialVotes = votesRes.data || []
  const initialTimeSlots = timeSlotsRes.data || []
  const initialVenues = venuesRes.data || []

  return (
    <AdminAnalyticsClient 
      initialSessions={initialSessions as any}
      initialTracks={initialTracks as any}
      initialMembers={initialMembers as any}
      initialVotes={initialVotes as any}
      initialTimeSlots={initialTimeSlots as any}
      initialVenues={initialVenues as any}
    />
  )
}
