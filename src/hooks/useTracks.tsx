'use client'

import * as React from 'react'

import { createClient } from '@/lib/supabase/client'

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
  const supabase = React.useMemo(() => createClient(), [])
  const [tracks, setTracks] = React.useState<Track[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true

    const fetchTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select('id,name,color')
          .eq('is_active', true)
          .order('name')

        if (error) throw error

        if (mounted && data) {
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
