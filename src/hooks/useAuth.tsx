'use client'

import * as React from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  email: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  affiliation: string | null
  building: string | null
  telegram: string | null
  ens: string | null
  interests: string[] | null
  is_admin: boolean
  onboarding_completed: boolean
  vote_credits: number
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAdmin: boolean
  needsOnboarding: boolean
  signIn: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const supabase = createClient()

  const fetchProfile = React.useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (error) throw error
      if (data) setProfile(data as unknown as Profile)
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }, [supabase])

  React.useEffect(() => {
    console.log('[Auth] AuthProvider mounted.')
    let mounted = true

    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        
        if (session?.user) {
          if (mounted) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          }
        }
      } catch (err) {
        console.error('Error getting session:', err)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (session?.user) {
          // Prevent unnecessary refetches if user is the same
          if (user?.id !== session.user.id) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
        setIsLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile, user?.id])

  const signIn = React.useCallback(async (email: string) => {
    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
        }
      })

      if (error) throw error
      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }, [supabase])

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [supabase])

  const refreshProfile = React.useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

  const value = React.useMemo(() => ({
    user,
    profile,
    isLoading,
    isAdmin: profile?.is_admin ?? false,
    needsOnboarding: Boolean(user && profile && profile.onboarding_completed === false),
    signIn,
    signOut,
    refreshProfile,
  }), [user, profile, isLoading, signIn, signOut, refreshProfile])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
