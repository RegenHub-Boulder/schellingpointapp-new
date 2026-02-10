'use client'

import * as React from 'react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface Track {
  id: string
  name: string
  color: string | null
}

interface UseTracksResult {
  tracks: Track[]
  isLoading: boolean
}

export function useTracks(): UseTracksResult {
  const [tracks, setTracks] = React.useState<Track[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true

    const fetchTracks = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/tracks?is_active=eq.true&select=id,name,color&order=name`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
          }
        )

        if (response.ok && mounted) {
          const data = await response.json()
          setTracks(data)
        }
      } catch (err) {
        console.error('Error fetching tracks:', err)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchTracks()

    return () => {
      mounted = false
    }
  }, [])

  return { tracks, isLoading }
}
