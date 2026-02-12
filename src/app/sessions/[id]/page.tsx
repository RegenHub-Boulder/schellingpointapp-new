import type { Metadata } from 'next'
import { SessionDetailClient } from './SessionDetailClient'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface SessionPageProps {
  params: Promise<{ id: string }>
}

// Fetch session data for metadata generation (server-side)
async function getSession(id: string) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/sessions?id=eq.${id}&select=*,host:profiles!host_id(id,display_name,bio,avatar_url,affiliation,building,telegram,ens,interests),track:tracks(id,name,color),venue:venues(*),time_slot:time_slots(*)`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    )

    if (response.ok) {
      const data = await response.json()
      return data[0] || null
    }
    return null
  } catch {
    return null
  }
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({ params }: SessionPageProps): Promise<Metadata> {
  const { id } = await params
  const session = await getSession(id)

  if (!session) {
    return {
      title: 'Session Not Found - Schelling Point',
      description: 'This session could not be found.',
    }
  }

  // Build a concise description for social cards
  const hostName = session.host?.display_name || session.host_name || 'Anonymous'
  const trackName = session.track?.name ? ` | ${session.track.name}` : ''
  const format = session.format ? session.format.charAt(0).toUpperCase() + session.format.slice(1) : ''

  // Truncate description to ~155 chars for optimal display
  const rawDescription = session.description || 'Join this session at EthBoulder 2026'
  const truncatedDescription = rawDescription.length > 155
    ? rawDescription.substring(0, 152) + '...'
    : rawDescription

  const title = `${session.title} - Schelling Point`
  const description = `${format} by ${hostName}${trackName}. ${truncatedDescription}`

  // Build the canonical URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const sessionUrl = `${siteUrl}/sessions/${id}`

  return {
    title,
    description,
    openGraph: {
      title: session.title,
      description,
      url: sessionUrl,
      siteName: 'Schelling Point - EthBoulder 2026',
      images: [
        {
          url: '/ethboulder_banner.png',
          width: 1200,
          height: 630,
          alt: `${session.title} - EthBoulder 2026 Session`,
        },
      ],
      type: 'article',
      authors: [hostName],
    },
    twitter: {
      card: 'summary_large_image',
      title: session.title,
      description,
      images: ['/ethboulder_banner.png'],
    },
  }
}

export default async function SessionDetailPage({ params }: SessionPageProps) {
  const { id } = await params

  // Fetch session data server-side for initial render
  const session = await getSession(id)

  return <SessionDetailClient sessionId={id} initialSession={session} />
}
