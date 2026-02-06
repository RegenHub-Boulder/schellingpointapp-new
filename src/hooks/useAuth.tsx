'use client'

import * as React from 'react'
import type { User } from '@supabase/supabase-js'

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Refresh tokens 5 minutes before expiry
const TOKEN_REFRESH_MARGIN = 5 * 60

function getStorageKey() {
  return `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
}

// Refresh the access token using the refresh token
async function refreshSession(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: number
  user: any
} | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (response.ok) {
      const data = await response.json()
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
        user: data.user,
      }
    }
  } catch (err) {
    console.error('Error refreshing session:', err)
  }
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Track if we've processed the hash to avoid race conditions in StrictMode
  // Using useRef to ensure it's component-scoped, not module-scoped
  const hashProcessedRef = React.useRef(false)
  const [user, setUser] = React.useState<User | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchProfile = React.useCallback(async (userId: string, accessToken: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) {
          setProfile(data[0] as Profile)
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }, [])

  React.useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      console.log('Checking auth state...')

      const storageKey = getStorageKey()
      let stored = localStorage.getItem(storageKey)

      // Check for hash-based auth tokens (from Supabase magic link redirect)
      // Use a ref to prevent race conditions in StrictMode
      if (typeof window !== 'undefined' && window.location.hash && !hashProcessedRef.current) {
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const expiresIn = params.get('expires_in')
        const tokenType = params.get('token_type')

        if (accessToken) {
          hashProcessedRef.current = true // Prevent second run from processing
          console.log('Found auth tokens in URL hash, storing...')

          // Clear the hash from URL immediately to prevent re-processing
          window.history.replaceState(null, '', window.location.pathname + window.location.search)

          // Fetch user data with the access token
          try {
            const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${accessToken}`,
              },
            })

            if (userResponse.ok) {
              const userData = await userResponse.json()
              const session = {
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_at: expiresIn ? Math.floor(Date.now() / 1000) + parseInt(expiresIn) : null,
                token_type: tokenType || 'bearer',
                user: userData,
              }
              // Always store to localStorage, even if component unmounts
              localStorage.setItem(storageKey, JSON.stringify(session))
              console.log('Stored session for:', userData.email)

              // Only update React state if still mounted
              if (mounted) {
                setUser(userData as User)
                await fetchProfile(userData.id, accessToken)
                setIsLoading(false)
              }
              return // Auth complete, no need to continue
            } else {
              const errorText = await userResponse.text()
              console.error('Failed to fetch user with hash token:', errorText)
            }
          } catch (err) {
            console.error('Error fetching user with hash token:', err)
          }
        }
      }

      // If nothing in localStorage, check if server has a session (from cookie auth)
      if (!stored) {
        console.log('No localStorage session, checking server...')
        try {
          const response = await fetch('/api/auth/session')
          if (response.ok) {
            const data = await response.json()
            if (data.session) {
              console.log('Found server session, syncing to localStorage')
              // Store the session in localStorage for future use
              localStorage.setItem(storageKey, JSON.stringify(data.session))
              stored = JSON.stringify(data.session)
            }
          }
        } catch (err) {
          console.error('Error checking server session:', err)
        }
      }

      if (stored) {
        try {
          let session = JSON.parse(stored)
          console.log('Found stored session:', session?.user?.email)

          if (session?.user && session?.access_token) {
            const now = Math.floor(Date.now() / 1000)
            const expiresAt = session.expires_at || 0
            const isExpiredOrExpiring = expiresAt > 0 && (now >= expiresAt - TOKEN_REFRESH_MARGIN)

            // If token is expired or about to expire, try to refresh
            if (isExpiredOrExpiring && session.refresh_token) {
              console.log('Token expired or expiring soon, refreshing...')
              const newSession = await refreshSession(session.refresh_token)
              if (newSession) {
                console.log('Session refreshed successfully')
                session = newSession
                localStorage.setItem(storageKey, JSON.stringify(session))
              } else {
                console.log('Failed to refresh session, clearing')
                localStorage.removeItem(storageKey)
                if (mounted) {
                  setIsLoading(false)
                }
                return
              }
            }

            // Verify the session is still valid
            const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${session.access_token}`,
              },
            })

            if (response.ok) {
              const userData = await response.json()
              console.log('Session valid for:', userData.email)
              // Only update React state if still mounted
              if (mounted) {
                setUser(userData as User)
                await fetchProfile(userData.id, session.access_token)
              }
            } else {
              // Token validation failed - try refreshing before giving up
              if (session.refresh_token) {
                console.log('Token invalid, attempting refresh...')
                const newSession = await refreshSession(session.refresh_token)
                if (newSession) {
                  console.log('Session refreshed after validation failure')
                  localStorage.setItem(storageKey, JSON.stringify(newSession))
                  if (mounted) {
                    setUser(newSession.user as User)
                    await fetchProfile(newSession.user.id, newSession.access_token)
                  }
                } else {
                  console.log('Refresh failed, clearing session')
                  localStorage.removeItem(storageKey)
                }
              } else {
                console.log('Session invalid, no refresh token, clearing')
                localStorage.removeItem(storageKey)
              }
            }
          }
        } catch (err) {
          console.error('Error parsing session:', err)
        }
      } else {
        console.log('No stored session found')
      }

      if (mounted) {
        setIsLoading(false)
      }
    }

    initAuth()

    return () => {
      mounted = false
    }
  }, [fetchProfile])

  // Periodic token refresh to keep session alive
  React.useEffect(() => {
    if (!user) return

    const checkAndRefresh = async () => {
      const storageKey = getStorageKey()
      const stored = localStorage.getItem(storageKey)
      if (!stored) return

      try {
        const session = JSON.parse(stored)
        const now = Math.floor(Date.now() / 1000)
        const expiresAt = session.expires_at || 0

        // Refresh if within 10 minutes of expiry
        if (expiresAt > 0 && now >= expiresAt - 10 * 60 && session.refresh_token) {
          console.log('Proactively refreshing token...')
          const newSession = await refreshSession(session.refresh_token)
          if (newSession) {
            console.log('Token refreshed proactively')
            localStorage.setItem(storageKey, JSON.stringify(newSession))
            setUser(newSession.user as User)
          }
        }
      } catch (err) {
        console.error('Error in periodic refresh:', err)
      }
    }

    // Check every 5 minutes
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000)

    // Also refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  const signIn = React.useCallback(async (email: string) => {
    try {
      // Get the current origin for redirect (works in both dev and prod)
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined

      const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          create_user: true,
          gotrue_meta_security: {},
          ...(redirectTo && { redirect_to: redirectTo }),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { error: new Error(error.message || 'Failed to send magic link') }
      }

      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }, [])

  const signOut = React.useCallback(async () => {
    const storageKey = getStorageKey()
    localStorage.removeItem(storageKey)
    setUser(null)
    setProfile(null)
  }, [])

  const refreshProfile = React.useCallback(async () => {
    if (user) {
      const storageKey = getStorageKey()
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const session = JSON.parse(stored)
        await fetchProfile(user.id, session.access_token)
      }
    }
  }, [user, fetchProfile])

  const value = React.useMemo(() => ({
    user,
    profile,
    isLoading,
    isAdmin: profile?.is_admin ?? false,
    // Only show onboarding if the column exists (is explicitly false) and profile exists
    // If onboarding_completed is undefined (column doesn't exist), don't show modal
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
