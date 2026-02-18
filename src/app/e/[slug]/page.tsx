'use client';

import Link from 'next/link';
import { Calendar, MapPin, Users, Vote, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEvent, useEventRole } from '@/contexts/EventContext';
import { formatEventDate } from '@/lib/events/dates';

export default function EventPage() {
  const event = useEvent();
  const { isAdmin, isMember, isLoading } = useEventRole();

  const statusBadge = {
    draft: { label: 'Draft', variant: 'secondary' as const },
    published: { label: 'Open', variant: 'default' as const },
    voting: { label: 'Voting Open', variant: 'default' as const },
    scheduling: { label: 'Scheduling', variant: 'secondary' as const },
    live: { label: 'Live Now', variant: 'destructive' as const },
    completed: { label: 'Completed', variant: 'secondary' as const },
    archived: { label: 'Archived', variant: 'outline' as const },
  }[event.status];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/10 to-background py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant={statusBadge.variant} className="mb-4">
            {statusBadge.label}
          </Badge>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {event.name}
          </h1>

          {event.tagline && (
            <p className="text-xl text-muted-foreground mb-6">{event.tagline}</p>
          )}

          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {formatEventDate(event.startDate, event.timezone, {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                -{' '}
                {formatEventDate(event.endDate, event.timezone, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            {event.locationName && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.locationName}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href={`/e/${event.slug}/sessions`}>
                <FileText className="mr-2 h-4 w-4" />
                Browse Sessions
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/e/${event.slug}/schedule`}>
                <Clock className="mr-2 h-4 w-4" />
                View Schedule
              </Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="secondary" size="lg">
                <Link href={`/e/${event.slug}/admin`}>Admin Dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {event.description && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isMember && (
            <>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <Link href={`/e/${event.slug}/propose`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Propose a Session</h3>
                        <p className="text-sm text-muted-foreground">
                          Share your knowledge with the community
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <Link href={`/e/${event.slug}/my-votes`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Vote className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">My Votes</h3>
                        <p className="text-sm text-muted-foreground">
                          See how you&apos;ve allocated your vote credits
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <Link href={`/e/${event.slug}/my-schedule`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">My Schedule</h3>
                        <p className="text-sm text-muted-foreground">
                          View your favorited sessions
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <Link href={`/e/${event.slug}/participants`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Participants</h3>
                        <p className="text-sm text-muted-foreground">
                          See who&apos;s attending
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
