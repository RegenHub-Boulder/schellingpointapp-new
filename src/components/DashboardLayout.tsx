'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
import { useAuth } from '@/hooks/useAuth'
import { cn, votesToCredits } from '@/lib/utils'

const TOTAL_CREDITS = 100
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

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/sessions', label: 'Sessions', icon: Presentation },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/my-schedule', label: 'My Schedule', icon: Heart },
  { href: '/my-votes', label: 'My Votes', icon: ClipboardList },
  { href: '/participants', label: 'Participants', icon: Users },
]

const actionItems = [
  { href: '/propose', label: 'Propose Session', icon: PlusCircle },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const { user, profile, signOut, needsOnboarding, refreshProfile } = useAuth()
  const [showOnboarding, setShowOnboarding] = React.useState(false)
  const [showSettings, setShowSettings] = React.useState(false)
  const [userVotes, setUserVotes] = React.useState<Record<string, number>>({})

  // Calculate credits spent from user votes
  const creditsSpent = React.useMemo(() => {
    return Object.values(userVotes).reduce((sum, votes) => sum + votesToCredits(votes), 0)
  }, [userVotes])

  // Fetch user's votes when user changes
  React.useEffect(() => {
    if (!user) {
      setUserVotes({})
      return
    }

    const fetchUserVotes = async () => {
      const token = getAccessToken()
      if (!token) return

      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/votes?user_id=eq.${user.id}&select=session_id,vote_count`,
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
        }
      } catch (err) {
        console.error('Error fetching user votes:', err)
      }
    }

    fetchUserVotes()
  }, [user])

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
                <img src="/logo.svg" alt="Schelling Point" className="h-8 w-8 rounded" />
                <span className="hidden sm:inline">Schelling Point</span>
              </Link>
              {profile?.is_admin && (
                <Badge variant="secondary" className="text-xs bg-[#B2FF00]/20 text-[#B2FF00] border-[#B2FF00]/30">
                  Admin
                </Badge>
              )}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-3">
              {user && (
                <>
                  {profile?.is_admin && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin">
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
                  <Button variant="ghost" size="sm" onClick={signOut}>
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
            <CreditBar total={TOTAL_CREDITS} spent={creditsSpent} />
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1 py-2 -mb-px">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-center gap-2 px-2 sm:px-3 py-2.5 min-h-[44px] min-w-[44px] text-sm font-medium rounded-md whitespace-nowrap transition-colors',
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
                  className="flex items-center justify-center gap-2 px-2 sm:px-3 py-2.5 min-h-[44px] min-w-[44px] text-sm font-medium rounded-md whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ml-auto sm:ml-0"
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
      <footer className="border-t mt-auto py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground/50 text-xs">
            Made with &lt;3 at{' '}
            <a
              href="https://regenhub.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              The Regen Hub
            </a>
          </p>
        </div>
      </footer>

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
