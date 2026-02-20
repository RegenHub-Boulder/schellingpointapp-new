'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from './useAuth'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface Notification {
  id: string
  user_id: string
  event_id: string | null
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  action_url: string | null
  created_at: string
  read_at: string | null
}

interface UseNotificationsOptions {
  eventId?: string
  limit?: number
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { limit = 10, eventId } = options
  const { user } = useAuth()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (eventId) {
        query = query.eq('event_id', eventId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read_at).length || 0)
      setError(null)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [user, limit, eventId])

  // Fetch unread count only (for badge)
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    try {
      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (eventId) {
        query = query.eq('event_id', eventId)
      }

      const { count, error: countError } = await query

      if (countError) throw countError
      setUnreadCount(count || 0)
    } catch (err) {
      console.error('Error fetching unread count:', err)
    }
  }, [user, eventId])

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Optimistically update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }, [user])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      let query = supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (eventId) {
        query = query.eq('event_id', eventId)
      }

      const { error: updateError } = await query

      if (updateError) throw updateError

      // Optimistically update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }, [user, eventId])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification

          // Only add if it matches our event filter
          if (eventId && newNotification.event_id !== eventId) return

          setNotifications(prev => [newNotification, ...prev.slice(0, limit - 1)])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, eventId, limit])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
    refreshCount: fetchUnreadCount,
  }
}
