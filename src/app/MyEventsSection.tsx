'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Settings, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface MyEvent {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  start_date: string;
  end_date: string;
  location_name: string | null;
  status: string;
  role: string;
  logo_url: string | null;
}

// Status badge configuration
const statusBadgeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Open', variant: 'default' },
  proposals_open: { label: 'Proposals Open', variant: 'success' },
  voting_open: { label: 'Voting Open', variant: 'success' },
  scheduling: { label: 'Scheduling', variant: 'secondary' },
  live: { label: 'Live Now', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'secondary' },
  archived: { label: 'Archived', variant: 'outline' },
};

// Format date range
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      const session = JSON.parse(stored);
      return session?.access_token || null;
    } catch {
      return null;
    }
  }
  return null;
}

export function MyEventsSection() {
  const { user, isLoading: authLoading } = useAuth();
  const [events, setEvents] = React.useState<MyEvent[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchMyEvents = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch event memberships where user is owner or admin
        const memberResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/event_members?user_id=eq.${user.id}&role=in.(owner,admin)&select=event_id,role`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!memberResponse.ok) {
          setIsLoading(false);
          return;
        }

        const memberships = await memberResponse.json();
        if (!memberships || memberships.length === 0) {
          setEvents([]);
          setIsLoading(false);
          return;
        }

        const eventIds = memberships.map((m: { event_id: string }) => m.event_id);
        const roleMap: Record<string, string> = {};
        memberships.forEach((m: { event_id: string; role: string }) => {
          roleMap[m.event_id] = m.role;
        });

        // Fetch event details
        const eventsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/events?id=in.(${eventIds.join(',')})&select=id,slug,name,tagline,start_date,end_date,location_name,status,logo_url&order=start_date.desc`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          const eventsWithRoles = eventsData.map((e: MyEvent) => ({
            ...e,
            role: roleMap[e.id] || 'admin',
          }));
          setEvents(eventsWithRoles);
        }
      } catch (err) {
        console.error('Error fetching my events:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchMyEvents();
    }
  }, [user, authLoading]);

  // Don't render anything if not logged in
  if (!user && !authLoading) {
    return null;
  }

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">My Events</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">My Events</h2>
          <Button asChild>
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              Create New Event
            </Link>
          </Button>
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const badge = statusBadgeConfig[event.status] || statusBadgeConfig.draft;

              return (
                <Card key={event.id} className="group card-hover border-border/50 hover:border-primary/30">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {event.logo_url && (
                          <img
                            src={event.logo_url}
                            alt={event.name}
                            className="w-10 h-10 rounded-lg bg-muted"
                          />
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                            {event.name}
                          </h3>
                          <span className="text-xs text-muted-foreground capitalize">
                            {event.role}
                          </span>
                        </div>
                      </div>
                      <Badge variant={badge.variant} className="flex-shrink-0">
                        {badge.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDateRange(event.start_date, event.end_date)}</span>
                      </div>
                      {event.location_name && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/e/${event.slug}`}>
                          View Event
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/e/${event.slug}/admin`}>
                          <Settings className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t created any events yet.
            </p>
            <Button asChild>
              <Link href="/create">
                Create Your First Event
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </section>
  );
}
