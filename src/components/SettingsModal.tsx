'use client'

import * as React from 'react'
import {
  Loader2,
  User,
  Building2,
  Rocket,
  Send,
  Hash,
  Save,
  X,
  Plus,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const DEFAULT_INTERESTS = [
  'Governance',
  'DeFi',
  'DAOs',
  'NFTs',
  'Layer 2',
  'Privacy',
  'Security',
  'UX/UI',
  'Public Goods',
  'ReFi',
  'AI/ML',
  'Developer Tools',
]

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, profile, refreshProfile } = useAuth()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const interestInputRef = React.useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [affiliation, setAffiliation] = React.useState('')
  const [building, setBuilding] = React.useState('')
  const [telegram, setTelegram] = React.useState('')
  const [avatarUrl, setAvatarUrl] = React.useState('')
  const [interests, setInterests] = React.useState<string[]>([])
  const [newInterest, setNewInterest] = React.useState('')

  const [isSaving, setIsSaving] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Autocomplete state
  const [allInterests, setAllInterests] = React.useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)

  // Fetch all unique interests from profiles
  React.useEffect(() => {
    if (isOpen) {
      const fetchAllInterests = async () => {
        try {
          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=interests`,
            {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
              },
            }
          )
          if (response.ok) {
            const profiles = await response.json()
            const interestSet = new Set<string>(DEFAULT_INTERESTS)
            profiles.forEach((p: { interests: string[] | null }) => {
              p.interests?.forEach((i) => interestSet.add(i))
            })
            setAllInterests(Array.from(interestSet).sort())
          }
        } catch (err) {
          console.error('Error fetching interests:', err)
        }
      }
      fetchAllInterests()
    }
  }, [isOpen])

  // Load profile data into form when modal opens
  React.useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
      setAffiliation(profile.affiliation || '')
      setBuilding(profile.building || '')
      setTelegram(profile.telegram || '')
      setAvatarUrl(profile.avatar_url || '')
      setInterests(profile.interests || [])
      setSaveMessage(null)
      setNewInterest('')
      setShowSuggestions(false)
    }
  }, [isOpen, profile])

  // Filter suggestions based on input
  const filteredSuggestions = React.useMemo(() => {
    if (!newInterest.trim()) return []
    const query = newInterest.toLowerCase()
    return allInterests
      .filter((i) =>
        i.toLowerCase().includes(query) &&
        !interests.includes(i)
      )
      .slice(0, 8)
  }, [newInterest, allInterests, interests])

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string)
      setIsUploading(false)
    }
    reader.onerror = () => {
      setSaveMessage({ type: 'error', text: 'Failed to read image.' })
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const handleAddInterest = (interest?: string) => {
    const toAdd = interest || newInterest.trim()
    if (toAdd && !interests.includes(toAdd)) {
      setInterests([...interests, toAdd])
      setNewInterest('')
      setShowSuggestions(false)
      setHighlightedIndex(-1)
    }
  }

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest))
  }

  const handleInterestKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        handleAddInterest(filteredSuggestions[highlightedIndex])
      } else {
        handleAddInterest()
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setHighlightedIndex(-1)
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
        setSaveMessage({ type: 'success', text: 'Saved!' })
        refreshProfile()
        // Auto-close after success
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        const error = await response.text()
        console.error('Save error:', error)
        setSaveMessage({ type: 'error', text: 'Failed to save. Please try again.' })
      }
    } catch (err) {
      console.error('Save error:', err)
      setSaveMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-card/95 backdrop-blur-sm rounded-t-2xl">
          <h2 className="text-lg font-semibold">Edit Profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName || ''}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarUrl('')}
                  />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">Click to upload a photo</p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Display Name
            </label>
            <Input
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
            />
          </div>

          {/* Affiliation */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Organization
            </label>
            <Input
              placeholder="Your company or organization"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
            />
          </div>

          {/* Building */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Rocket className="h-4 w-4 text-muted-foreground" />
              What are you building?
            </label>
            <Textarea
              placeholder="Describe your current project..."
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              rows={2}
            />
          </div>

          {/* Telegram */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              Telegram
            </label>
            <Input
              placeholder="@username"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
            />
          </div>

          {/* Interests */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Interests
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <Input
                  ref={interestInputRef}
                  placeholder="Type to search interests..."
                  value={newInterest}
                  onChange={(e) => {
                    setNewInterest(e.target.value)
                    setShowSuggestions(true)
                    setHighlightedIndex(-1)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 150)
                  }}
                  onKeyDown={handleInterestKeyDown}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => handleAddInterest()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {/* Autocomplete dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-12 mt-1 bg-card border rounded-lg shadow-lg overflow-hidden">
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                        index === highlightedIndex ? 'bg-muted' : ''
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleAddInterest(suggestion)
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
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
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-4 p-4 border-t bg-card/95 backdrop-blur-sm rounded-b-2xl">
          <div className="flex-1">
            {saveMessage && (
              <p
                className={`text-sm ${
                  saveMessage.type === 'success' ? 'text-green-500' : 'text-destructive'
                }`}
              >
                {saveMessage.text}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-primary-glow">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
