import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from './AdminDashboardClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  
  if (!event) {
    return { title: 'Admin Not Found' }
  }

  return {
    title: `Admin | ${event.name}`,
    description: `Manage ${event.name}`,
  }
}

export default async function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  
  if (!event) {
    notFound()
  }

  const supabase = await createClient()

  const [sessionsRes, venuesRes, timeSlotsRes, tracksRes] = await Promise.all([
    supabase.from('sessions').select('*,venue:venues(id,name),time_slot:time_slots(id,label,start_time),track:tracks(id,name,color),cohosts:session_cohosts(user_id)').eq('event_id', event.id).order('total_votes', { ascending: false }),
    supabase.from('venues').select('*').eq('event_id', event.id).order('name'),
    supabase.from('time_slots').select('*').eq('event_id', event.id).order('start_time'),
    supabase.from('tracks').select('*').eq('event_id', event.id).order('name')
  ])

  const sessions = sessionsRes.data || []
  const venues = venuesRes.data || []
  const timeSlots = timeSlotsRes.data || []
  const tracks = tracksRes.data || []

  return (
    <AdminDashboardClient 
      initialSessions={sessions as any}
      initialVenues={venues as any}
      initialTimeSlots={timeSlots as any}
      initialTracks={tracks as any}
    />
  )
}
