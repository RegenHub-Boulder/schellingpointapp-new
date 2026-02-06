'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  User,
  Building2,
  Rocket,
  Send,
  Hash,
  Save,
  ArrowLeft,
  X,
  Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'

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

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [affiliation, setAffiliation] = React.useState('')
  const [building, setBuilding] = React.useState('')
  const [telegram, setTelegram] = React.useState('')
  const [avatarUrl, setAvatarUrl] = React.useState('')
  const [interests, setInterests] = React.useState<string[]>([])
  const [newInterest, setNewInterest] = React.useState('')

  const [isSaving, setIsSaving] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load profile data into form
  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
      setAffiliation(profile.affiliation || '')
      setBuilding(profile.building || '')
      setTelegram(profile.telegram || '')
      setAvatarUrl(profile.avatar_url || '')
      setInterests(profile.interests || [])
    }
  }, [profile])

  const handleAddInterest = () => {
    const trimmed = newInterest.trim()
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed])
      setNewInterest('')
    }
  }

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddInterest()
    }
  }

  const handleSave = async () => {
    if (!user) return

    const token = getAccessToken()
    if (!token) {
      setSaveMessage({ type: 'error', text: 'Not authenticated. Please sign in again.' })
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            display_name: displayName.trim() || null,
            bio: bio.trim() || null,
            affiliation: affiliation.trim() || null,
            building: building.trim() || null,
            telegram: telegram.trim() || null,
            avatar_url: avatarUrl.trim() || null,
            interests: interests.length > 0 ? interests : null,
          }),
        }
      )

      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'Profile saved successfully!' })
        refreshProfile()
      } else {
        const error = await response.text()
        console.error('Save error:', error)
        setSaveMessage({ type: 'error', text: 'Failed to save profile. Please try again.' })
      }
    } catch (err) {
      console.error('Save error:', err)
      setSaveMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your profile</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Preview */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName || ''}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarUrl('')}
                  />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input
                  id="avatar"
                  placeholder="https://example.com/your-photo.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </div>

            {/* Affiliation */}
            <div className="space-y-2">
              <Label htmlFor="affiliation" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organization / Affiliation
              </Label>
              <Input
                id="affiliation"
                placeholder="Your company or organization"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
              />
            </div>

            {/* Building */}
            <div className="space-y-2">
              <Label htmlFor="building" className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                What are you building?
              </Label>
              <Textarea
                id="building"
                placeholder="Describe your current project..."
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                rows={2}
              />
            </div>

            {/* Telegram */}
            <div className="space-y-2">
              <Label htmlFor="telegram" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Telegram Username
              </Label>
              <Input
                id="telegram"
                placeholder="@username"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
              />
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Interests
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add an interest..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" variant="outline" onClick={handleAddInterest}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {interests.map((interest) => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20 group"
                      onClick={() => handleRemoveInterest(interest)}
                    >
                      {interest}
                      <X className="h-3 w-3 ml-1 group-hover:text-destructive" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t flex items-center justify-between">
              {saveMessage && (
                <p
                  className={`text-sm ${
                    saveMessage.type === 'success' ? 'text-green-500' : 'text-destructive'
                  }`}
                >
                  {saveMessage.text}
                </p>
              )}
              <div className="flex-1" />
              <Button onClick={handleSave} disabled={isSaving} className="btn-primary-glow">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
