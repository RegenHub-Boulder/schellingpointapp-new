'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Loader2,
  Users,
  Mail,
  Shield,
  Search,
  Building2,
  Rocket,
  Send,
  Hexagon,
  X,
  Hash,
  User,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { useEvent } from '@/contexts/EventContext'
import { cn } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface Participant {
  id: string
  user_id: string
  role: string
  profile: {
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
  } | null
}

export default function ParticipantsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    }>
      <ParticipantsContent />
    </Suspense>
  )
}

function ParticipantsContent() {
  const { isLoading: authLoading } = useAuth()
  const event = useEvent()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [participants, setParticipants] = React.useState<Participant[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [selectedInterests, setSelectedInterests] = React.useState<Set<string>>(new Set())
  const [selectedParticipant, setSelectedParticipant] = React.useState<Participant | null>(null)
  const highlightHandledRef = React.useRef(false)

  // Fetch event members
  React.useEffect(() => {
    const fetchParticipants = async () => {
      try {
        // Fetch event members with their profiles
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/event_members?event_id=eq.${event.id}&select=id,user_id,role,profile:profiles(id,email,display_name,bio,avatar_url,affiliation,building,telegram,ens,interests)`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          // Filter out members without profiles
          setParticipants(data.filter((p: Participant) => p.profile))
        }
      } catch (err) {
        console.error('Error fetching participants:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchParticipants()
  }, [event.id])

  // Auto-open profile when highlight param is present and participants are loaded (only once)
  React.useEffect(() => {
    if (highlightId && participants.length > 0 && !highlightHandledRef.current) {
      const highlighted = participants.find((p) => p.profile?.id === highlightId)
      if (highlighted) {
        setSelectedParticipant(highlighted)
        highlightHandledRef.current = true
      }
    }
  }, [highlightId, participants])

  // Get all unique interests
  const allInterests = React.useMemo(() => {
    const interests = new Set<string>()
    participants.forEach((p) => {
      p.profile?.interests?.forEach((i) => interests.add(i))
    })
    return Array.from(interests).sort()
  }, [participants])

  // Filter participants
  const filteredParticipants = React.useMemo(() => {
    return participants.filter((p) => {
      if (!p.profile) return false
      const searchLower = search.toLowerCase()
      const matchesSearch =
        !search ||
        p.profile.display_name?.toLowerCase().includes(searchLower) ||
        p.profile.email.toLowerCase().includes(searchLower) ||
        p.profile.affiliation?.toLowerCase().includes(searchLower) ||
        p.profile.building?.toLowerCase().includes(searchLower)

      const matchesInterests =
        selectedInterests.size === 0 ||
        Array.from(selectedInterests).every((interest) => p.profile?.interests?.includes(interest))

      return matchesSearch && matchesInterests
    })
  }, [participants, search, selectedInterests])

  // Separate organizers (owner, admin, moderator) from regular members
  const organizers = filteredParticipants.filter((p) =>
    ['owner', 'admin', 'moderator'].includes(p.role)
  )
  const regularParticipants = filteredParticipants.filter((p) =>
    !['owner', 'admin', 'moderator'].includes(p.role)
  )

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
          <h1 className="text-2xl font-bold">Participants</h1>
          <p className="text-muted-foreground mt-1">
            {participants.length} people registered for {event.name}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or affiliation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Interest Filter */}
          {allInterests.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Filter by interests:</span>
              {selectedInterests.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInterests(new Set())}
                  className="text-muted-foreground"
                >
                  Clear all
                </Button>
              )}
              {allInterests.map((interest) => (
                <Button
                  key={interest}
                  variant={selectedInterests.has(interest) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newSet = new Set(selectedInterests)
                    if (newSet.has(interest)) {
                      newSet.delete(interest)
                    } else {
                      newSet.add(interest)
                    }
                    setSelectedInterests(newSet)
                  }}
                >
                  {interest}
                </Button>
              ))}
            </div>
          )}
        </div>

        {filteredParticipants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">
                {participants.length === 0 ? 'No participants yet' : 'No matches found'}
              </h2>
              <p className="text-muted-foreground">
                {participants.length === 0
                  ? 'Be the first to join the event!'
                  : 'Try adjusting your search or filters'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Organizers */}
            {organizers.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Organizers ({organizers.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {organizers.map((participant) => (
                    <ParticipantCard
                      key={participant.id}
                      participant={participant}
                      onClick={() => setSelectedParticipant(participant)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Participants */}
            {regularParticipants.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participants ({regularParticipants.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {regularParticipants.map((participant) => (
                    <ParticipantCard
                      key={participant.id}
                      participant={participant}
                      onClick={() => setSelectedParticipant(participant)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedParticipant && (
        <ProfileModal
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />
      )}
    </DashboardLayout>
  )
}

function ParticipantCard({
  participant,
  onClick,
}: {
  participant: Participant
  onClick: () => void
}) {
  const profile = participant.profile
  if (!profile) return null

  const isOrganizer = ['owner', 'admin', 'moderator'].includes(participant.role)
  const roleLabel = participant.role === 'owner' ? 'Owner' :
                    participant.role === 'admin' ? 'Admin' :
                    participant.role === 'moderator' ? 'Moderator' :
                    participant.role === 'track_lead' ? 'Track Lead' :
                    participant.role === 'volunteer' ? 'Volunteer' : null

  return (
    <Card
      className="card-hover cursor-pointer border-border/50 hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || ''}
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                className={cn(
                  'font-medium text-lg',
                  isOrganizer ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {(profile.display_name || profile.email)[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">
                {profile.display_name || 'Anonymous'}
              </span>
              {roleLabel && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-[#B2FF00]/20 text-[#B2FF00] border-[#B2FF00]/30"
                >
                  {roleLabel}
                </Badge>
              )}
            </div>
            {profile.affiliation && (
              <p className="text-sm text-muted-foreground truncate">
                {profile.affiliation}
              </p>
            )}
            {profile.interests && profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {profile.interests.slice(0, 3).map((interest) => (
                  <Badge key={interest} variant="outline" className="text-xs">
                    {interest}
                  </Badge>
                ))}
                {profile.interests.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{profile.interests.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileModal({
  participant,
  onClose,
}: {
  participant: Participant
  onClose: () => void
}) {
  const profile = participant.profile
  if (!profile) return null

  const isOrganizer = ['owner', 'admin', 'moderator'].includes(participant.role)
  const roleLabel = participant.role === 'owner' ? 'Owner' :
                    participant.role === 'admin' ? 'Admin' :
                    participant.role === 'moderator' ? 'Moderator' :
                    participant.role === 'track_lead' ? 'Track Lead' :
                    participant.role === 'volunteer' ? 'Volunteer' : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 bg-card border rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-primary/10 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || ''}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">
                  {profile.display_name || 'Anonymous'}
                </h2>
                {roleLabel && (
                  <Badge className="bg-[#B2FF00]/20 text-[#B2FF00] border-[#B2FF00]/30">
                    {roleLabel}
                  </Badge>
                )}
              </div>
              {profile.affiliation && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Building2 className="h-4 w-4" />
                  {profile.affiliation}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {profile.bio && (
            <div>
              <p className="text-foreground">{profile.bio}</p>
            </div>
          )}

          {profile.building && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                What they're building
              </label>
              <p className="text-foreground">{profile.building}</p>
            </div>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Interests
              </label>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge key={interest} variant="secondary">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="flex flex-col gap-2 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a
                href={`mailto:${profile.email}`}
                className="text-primary hover:underline break-all"
              >
                {profile.email}
              </a>
            </div>
            {profile.telegram && (
              <div className="flex items-center gap-2 text-sm">
                <Send className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={`https://t.me/${profile.telegram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {profile.telegram}
                </a>
              </div>
            )}
            {profile.ens && (
              <div className="flex items-center gap-2 text-sm">
                <Hexagon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={`https://app.ens.domains/${profile.ens}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {profile.ens}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
