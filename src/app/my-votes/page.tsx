'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ClipboardList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { votesToCredits } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getAccessToken(): string | null {
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

interface Vote {
  session_id: string
  vote_count: number
  credits_spent: number
  session: {
    id: string
    title: string
    format: string
    host_name: string | null
  }
}

export default function MyVotesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [votes, setVotes] = React.useState<Vote[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  React.useEffect(() => {
    if (!user) return

    const fetchVotes = async () => {
      const token = getAccessToken()
      if (!token) return

      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/votes?user_id=eq.${user.id}&select=session_id,vote_count,credits_spent,session:sessions(id,title,format,host_name)`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setVotes(data.filter((v: Vote) => v.session))
        }
      } catch (err) {
        console.error('Error fetching votes:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVotes()
  }, [user])

  const totalCreditsSpent = votes.reduce((sum, v) => sum + v.credits_spent, 0)
  const totalVotes = votes.reduce((sum, v) => sum + v.vote_count, 0)

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Votes</h1>
          <p className="text-muted-foreground mt-1">
            Track your voting activity and credit usage
          </p>
        </div>

        {/* Summary Card */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">{votes.length}</div>
                <div className="text-sm text-muted-foreground">Sessions Voted</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{totalVotes}</div>
                <div className="text-sm text-muted-foreground">Total Votes</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{totalCreditsSpent}</div>
                <div className="text-sm text-muted-foreground">Credits Used</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-500">{100 - totalCreditsSpent}</div>
                <div className="text-sm text-muted-foreground">Credits Remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {votes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">No votes yet</h2>
              <p className="text-muted-foreground mb-4">
                Browse sessions and vote for the ones you want to attend.
              </p>
              <Button asChild>
                <Link href="/sessions">Browse Sessions</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold">Your Votes</h2>
            {votes
              .sort((a, b) => b.vote_count - a.vote_count)
              .map((vote) => (
                <Link key={vote.session_id} href={`/sessions/${vote.session.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="capitalize text-xs">
                              {vote.session.format}
                            </Badge>
                          </div>
                          <h3 className="font-medium truncate">{vote.session.title}</h3>
                          {vote.session.host_name && (
                            <p className="text-sm text-muted-foreground">
                              by {vote.session.host_name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{vote.vote_count}</div>
                          <div className="text-xs text-muted-foreground">
                            {vote.credits_spent} credits
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
