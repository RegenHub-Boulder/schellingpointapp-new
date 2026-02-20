'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from './useAuth'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type NotificationCategory =
  | 'session_updates'
  | 'voting_updates'
  | 'collaboration'
  | 'event_announcements'
  | 'admin_alerts'

export interface NotificationPreference {
  id: string
  user_id: string
  event_id: string | null
  category: NotificationCategory
  email_enabled: boolean
  in_app_enabled: boolean
  push_enabled: boolean
}

// Category metadata for display
export const categoryInfo: Record<NotificationCategory, { label: string; description: string }> = {
  session_updates: {
    label: 'Session Updates',
    description: 'When your sessions are approved, rejected, scheduled, or rescheduled',
  },
  voting_updates: {
    label: 'Voting Updates',
    description: 'Vote milestones for your sessions (10, 25, 50, 100 votes)',
  },
  collaboration: {
    label: 'Collaboration',
    description: 'Co-host invitations and responses',
  },
  event_announcements: {
    label: 'Event Announcements',
    description: 'Voting periods, schedule publication, event reminders',
  },
  admin_alerts: {
    label: 'Admin Alerts',
    description: 'New proposals and items needing review (admin only)',
  },
}

// Default preferences
const defaultPreferences: Omit<NotificationPreference, 'id' | 'user_id' | 'event_id' | 'category'> = {
  email_enabled: true,
  in_app_enabled: true,
  push_enabled: false,
}

interface UseNotificationPreferencesOptions {
  eventId?: string
}

export function useNotificationPreferences(options: UseNotificationPreferencesOptions = {}) {
  const { eventId } = options
  const { user } = useAuth()

  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences([])
      setIsLoading(false)
      return
    }

    try {
      let query = supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)

      // Fetch event-specific or global preferences
      if (eventId) {
        query = query.or(`event_id.eq.${eventId},event_id.is.null`)
      } else {
        query = query.is('event_id', null)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setPreferences(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching notification preferences:', err)
      setError('Failed to load preferences')
    } finally {
      setIsLoading(false)
    }
  }, [user, eventId])

  // Get preference for a category (with fallback to defaults)
  const getPreference = useCallback((category: NotificationCategory): NotificationPreference => {
    // First check for event-specific preference
    if (eventId) {
      const eventPref = preferences.find(p => p.category === category && p.event_id === eventId)
      if (eventPref) return eventPref
    }

    // Then check for global preference
    const globalPref = preferences.find(p => p.category === category && !p.event_id)
    if (globalPref) return globalPref

    // Return default
    return {
      id: '',
      user_id: user?.id || '',
      event_id: eventId || null,
      category,
      ...defaultPreferences,
    }
  }, [preferences, eventId, user])

  // Update a preference
  const updatePreference = useCallback(async (
    category: NotificationCategory,
    updates: Partial<Pick<NotificationPreference, 'email_enabled' | 'in_app_enabled' | 'push_enabled'>>
  ) => {
    if (!user) return

    setIsSaving(true)

    try {
      const existingPref = preferences.find(
        p => p.category === category && (eventId ? p.event_id === eventId : !p.event_id)
      )

      if (existingPref) {
        // Update existing preference
        const { error: updateError } = await supabase
          .from('notification_preferences')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPref.id)

        if (updateError) throw updateError

        // Optimistically update local state
        setPreferences(prev =>
          prev.map(p =>
            p.id === existingPref.id ? { ...p, ...updates } : p
          )
        )
      } else {
        // Insert new preference
        const newPref = {
          user_id: user.id,
          event_id: eventId || null,
          category,
          ...defaultPreferences,
          ...updates,
        }

        const { data, error: insertError } = await supabase
          .from('notification_preferences')
          .insert(newPref)
          .select()
          .single()

        if (insertError) throw insertError

        setPreferences(prev => [...prev, data])
      }

      setError(null)
    } catch (err) {
      console.error('Error updating notification preference:', err)
      setError('Failed to save preference')
    } finally {
      setIsSaving(false)
    }
  }, [user, eventId, preferences])

  // Toggle a specific channel for a category
  const toggleChannel = useCallback(async (
    category: NotificationCategory,
    channel: 'email_enabled' | 'in_app_enabled' | 'push_enabled'
  ) => {
    const current = getPreference(category)
    await updatePreference(category, { [channel]: !current[channel] })
  }, [getPreference, updatePreference])

  // Initial fetch
  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return {
    preferences,
    isLoading,
    isSaving,
    error,
    getPreference,
    updatePreference,
    toggleChannel,
    refresh: fetchPreferences,
  }
}
