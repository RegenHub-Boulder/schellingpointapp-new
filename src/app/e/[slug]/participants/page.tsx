import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import ParticipantsClient from './ParticipantsClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  
  if (!event) {
    return { title: 'Participants Not Found' }
  }

  return {
    title: `Participants | ${event.name}`,
    description: `See who's attending ${event.name}`,
  }
}

export default async function ParticipantsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  
  if (!event) {
    notFound()
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_members')
    .select('id,user_id,role,profile:profiles(id,email,display_name,bio,avatar_url,affiliation,building,telegram,ens,interests)')
    .eq('event_id', event.id)

  let participants = []
  if (!error && data) {
    participants = (data as any[]).filter(p => p.profile)
  }

  return (
    <ParticipantsClient initialParticipants={participants} />
  )
}
