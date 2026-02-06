'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Calendar, MapPin, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TimeSlot {
  id: string
  label: string
  start_time: string
  end_time: string
}

interface Session {
  id: string
  title: string
  description: string | null
  format: string
  duration: number
  host_name: string | null
  venue: { name: string } | null
  time_slot: TimeSlot | null
}

export default function SchedulePage() {
  const { isLoading: authLoading } = useAuth()
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsRes, timeSlotsRes] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/sessions?status=eq.scheduled&select=id,title,description,format,duration,host_name,venue:venues(name),time_slot:time_slots(id,label,start_time,end_time)`,
            {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
              },
            }
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/time_slots?select=*&order=start_time`,
            {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
              },
            }
          ),
        ])

        if (sessionsRes.ok) {
          setSessions(await sessionsRes.json())
        }
        if (timeSlotsRes.ok) {
          setTimeSlots(await timeSlotsRes.json())
        }
      } catch (err) {
        console.error('Error fetching schedule:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Group sessions by time slot
  const sessionsBySlot = React.useMemo(() => {
    const grouped: Record<string, Session[]> = {}
    sessions.forEach((session) => {
      if (session.time_slot) {
        const slotId = session.time_slot.id
        if (!grouped[slotId]) {
          grouped[slotId] = []
        }
        grouped[slotId].push(session)
      }
    })
    return grouped
  }, [sessions])

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
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground mt-1">
            View the event schedule by time slot
          </p>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">No sessions scheduled yet</h2>
              <p className="text-muted-foreground">
                Check back later once the schedule has been published.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {timeSlots.map((slot) => {
              const slotSessions = sessionsBySlot[slot.id] || []
              if (slotSessions.length === 0) return null

              return (
                <div key={slot.id}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-md">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{slot.label}</span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {slotSessions.map((session) => (
                      <Link key={session.id} href={`/sessions/${session.id}`}>
                        <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="capitalize text-xs">
                                  {session.format}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {session.duration} min
                                </span>
                              </div>
                              <h3 className="font-medium">{session.title}</h3>
                              {session.host_name && (
                                <p className="text-sm text-muted-foreground">
                                  by {session.host_name}
                                </p>
                              )}
                              {session.venue && (
                                <div className="flex items-center gap-1.5 text-sm text-primary">
                                  <MapPin className="h-4 w-4" />
                                  <span>{session.venue.name}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
