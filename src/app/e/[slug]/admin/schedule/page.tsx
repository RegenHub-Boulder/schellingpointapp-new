import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import AdminScheduleClient from './AdminScheduleClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  
  if (!event) {
    return { title: 'Schedule Builder Not Found' }
  }

  return {
    title: `Schedule Builder | ${event.name}`,
    description: `Manage schedule for ${event.name}`,
  }
}

export default async function AdminSchedulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  
  if (!event) {
    notFound()
  }

  const supabase = await createClient()

  const [venuesRes, timeSlotsRes, sessionsRes, tracksRes] = await Promise.all([
    supabase.from('venues').select('*').eq('event_id', event.id).order('is_primary', { ascending: false }).order('name', { ascending: true }),
    supabase.from('time_slots').select('*').eq('event_id', event.id).order('start_time', { ascending: true }),
    supabase.from('sessions').select('*,track:tracks(id,name,slug,color)').eq('event_id', event.id).order('total_votes', { ascending: false }),
    supabase.from('tracks').select('*').eq('event_id', event.id).order('name', { ascending: true })
  ])

  const initialVenues = venuesRes.data || []
  const initialTimeSlots = timeSlotsRes.data || []
  const initialSessions = sessionsRes.data || []
  const initialTracks = tracksRes.data || []

  return (
    <AdminScheduleClient 
      initialVenues={initialVenues as any}
      initialTimeSlots={initialTimeSlots as any}
      initialSessions={initialSessions as any}
      initialTracks={initialTracks as any}
    />
  )
}
