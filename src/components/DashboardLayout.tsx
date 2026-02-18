'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Presentation,
  Calendar,
  Heart,
  ClipboardList,
  Users,
  PlusCircle,
  Settings,
  LogOut,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditBar } from '@/components/CreditBar'
import { OnboardingModal } from '@/components/auth/OnboardingModal'
import { SettingsModal } from '@/components/SettingsModal'
import { Footer } from '@/components/Footer'
import { useAuth } from '@/hooks/useAuth'
import { cn, votesToCredits } from '@/lib/utils'
import { useEvent, useEventRole } from '@/contexts/EventContext'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    try {
      const session = JSON.parse(stored)
      return session?.access_token || null
    } catch {
      return null
    }
  }
  return null
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

// Navigation items are now generated dynamically based on event slug
function getNavItems(eventSlug: string) {
  return [
    { href: `/e/${eventSlug}/dashboard`, label: 'Dashboard', icon: BarChart3 },
    { href: `/e/${eventSlug}/sessions`, label: 'Sessions', icon: Presentation },
    { href: `/e/${eventSlug}/schedule`, label: 'Schedule', icon: Calendar },
    { href: `/e/${eventSlug}/my-schedule`, label: 'My Schedule', icon: Heart },
    { href: `/e/${eventSlug}/my-votes`, label: 'My Votes', icon: ClipboardList },
    { href: `/e/${eventSlug}/participants`, label: 'Participants', icon: Users },
  ]
}

function getActionItems(eventSlug: string) {
  return [
    { href: `/e/${eventSlug}/propose`, label: 'Propose Session', icon: PlusCircle },
  ]
}

// Cache key for storing votes in sessionStorage
const VOTES_CACHE_KEY = 'schelling-point-user-votes'
const VOTES_USER_KEY = 'schelling-point-user-id'

function getCachedVotes(): Record<string, number> | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(VOTES_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch {}
  return null
}

function getCachedUserId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(VOTES_USER_KEY)
  } catch {}
  return null
}

function setCachedVotes(userId: string, votes: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(VOTES_CACHE_KEY, JSON.stringify(votes))
    sessionStorage.setItem(VOTES_USER_KEY, userId)
  } catch {}
}

function clearCachedVotes() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(VOTES_CACHE_KEY)
    sessionStorage.removeItem(VOTES_USER_KEY)
  } catch {}
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, signOut, needsOnboarding, refreshProfile } = useAuth()

  // Get event context
  const event = useEvent()
  const { isAdmin, voteCredits } = useEventRole()

  // Generate nav items based on event slug
  const navItems = React.useMemo(() => getNavItems(event.slug), [event.slug])
  const actionItems = React.useMemo(() => getActionItems(event.slug), [event.slug])

  const handleSignOut = async () => {
    await signOut()
    router.push(`/e/${event.slug}?logged_out=true`)
  }
  const [showOnboarding, setShowOnboarding] = React.useState(false)
  const [showSettings, setShowSettings] = React.useState(false)

  // Initialize userVotes from cache immediately to prevent flashing
  const [userVotes, setUserVotes] = React.useState<Record<string, number>>(() => {
    const cached = getCachedVotes()
    return cached || {}
  })
  const [votesLoaded, setVotesLoaded] = React.useState(() => {
    return getCachedVotes() !== null
  })

  // Calculate credits spent from user votes
  const creditsSpent = React.useMemo(() => {
    return Object.values(userVotes).reduce((sum, votes) => sum + votesToCredits(votes), 0)
  }, [userVotes])

  // Fetch user's votes when user changes, with caching
  React.useEffect(() => {
    if (!user) {
      setUserVotes({})
      clearCachedVotes()
      setVotesLoaded(true)
      return
    }

    // Check if cached data is for the current user
    const cachedUserId = getCachedUserId()
    if (cachedUserId !== user.id) {
      // Different user, clear cache and reset
      clearCachedVotes()
      setUserVotes({})
    }

    const fetchUserVotes = async () => {
      const token = getAccessToken()
      if (!token) {
        setVotesLoaded(true)
        return
      }

      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/votes?user_id=eq.${user.id}&event_id=eq.${event.id}&select=session_id,vote_count`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          const votesMap: Record<string, number> = {}
          data.forEach((v: { session_id: string; vote_count: number }) => {
            votesMap[v.session_id] = v.vote_count
          })
          setUserVotes(votesMap)
          setCachedVotes(user.id, votesMap)
        }
      } catch (err) {
        console.error('Error fetching user votes:', err)
      } finally {
        setVotesLoaded(true)
      }
    }

    fetchUserVotes()
  }, [user, event.id])

  // Show onboarding modal when needed
  React.useEffect(() => {
    if (needsOnboarding) {
      setShowOnboarding(true)
    }
  }, [needsOnboarding])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    refreshProfile()
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <Link href={`/e/${event.slug}/dashboard`} className="flex items-center gap-2 font-bold text-lg">
                <img src="/logo.svg" alt="Schelling Point" className="h-8 w-8 rounded" />
                <div className="hidden sm:flex flex-col">
                  <span className="font-bold text-lg leading-tight">Schelling Point</span>
                  <span className="text-xs text-muted-foreground leading-tight font-normal">{event.name}</span>
                </div>
              </Link>
              {isAdmin && (
                <Badge variant="secondary" className="text-xs bg-[#B2FF00]/20 text-[#B2FF00] border-[#B2FF00]/30">
                  Admin
                </Badge>
              )}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-3">
              {!user && (
                <Link
                  href="/login"
                  className="flex items-center justify-center px-2 md:px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex-shrink-0"
                >
                  Sign In
                </Link>
              )}
              {user && (
                <>
                  {isAdmin && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/e/${event.slug}/admin`}>
                        <Settings className="h-4 w-4 mr-1" />
                        Admin
                      </Link>
                    </Button>
                  )}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      {profile?.display_name || user.email}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.display_name || ''}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {(profile?.display_name || user.email || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </button>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Credits Bar */}
      {user && (
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-3">
            <CreditBar total={voteCredits} spent={creditsSpent} />
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1 py-2 -mb-px overflow-x-auto scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-2 md:px-3 py-2.5 min-h-[44px] min-w-[44px] text-xs md:text-sm font-medium rounded-md whitespace-nowrap transition-colors flex-shrink-0',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}

            {actionItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-center gap-1.5 px-2 md:px-3 py-2.5 min-h-[44px] min-w-[44px] text-xs md:text-sm font-medium rounded-md whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0 ml-auto"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <Footer variant="minimal" className="mt-auto" />

      {/* Onboarding Modal */}
      {showOnboarding && user && (
        <OnboardingModal
          userId={user.id}
          email={user.email || ''}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}
