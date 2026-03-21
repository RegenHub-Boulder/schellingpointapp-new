import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import ScheduleClient from './ScheduleClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  
  if (!event) {
    return { title: 'Schedule Not Found' }
  }

  return {
    title: `Schedule | ${event.name}`,
    description: `Full schedule for ${event.name}`,
  }
}

export default async function SchedulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  
  if (!event) {
    notFound()
  }

  const supabaseClient = await createClient()

  const [sessionsRes, timeSlotsRes, tracksRes] = await Promise.all([
    supabaseClient
      .from('sessions')
      .select('id,title,description,format,duration,host_name,is_self_hosted,custom_location,self_hosted_start_time,self_hosted_end_time,venue:venues(name),time_slot:time_slots(id,label,start_time,end_time),track:tracks(id,name,color)')
      .eq('event_id', event.id)
      .eq('status', 'scheduled'),
    supabaseClient
      .from('time_slots')
      .select('*')
      .eq('event_id', event.id)
      .order('start_time'),
    supabaseClient
      .from('tracks')
      .select('id,name,color')
      .eq('event_id', event.id)
      .eq('is_active', true)
      .order('name'),
  ])

  const initialSessions = sessionsRes.data || []
  const initialTimeSlots = timeSlotsRes.data || []
  const initialTracks = tracksRes.data || []

  return (
    <ScheduleClient 
      initialSessions={initialSessions as any}
      initialTimeSlots={initialTimeSlots as any}
      initialTracks={initialTracks as any}
    />
  )
}
