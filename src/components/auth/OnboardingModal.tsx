'use client'

import * as React from 'react'
import {
  User,
  Building2,
  Rocket,
  Hash,
  Send,
  Hexagon,
  Mail,
  Plus,
  X,
  Upload,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Vote,
  Heart,
  Mic,
  Calendar,
  Coins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface OnboardingModalProps {
  userId: string
  email: string
  onComplete: () => void
}

const suggestedInterests = [
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

// Intro slides explaining the app
const introSlides = [
  {
    icon: Sparkles,
    iconBg: 'bg-primary/20',
    iconColor: 'text-primary',
    title: 'Welcome to Schelling Point!',
    description: 'A community-driven unconference where YOU help shape the schedule. Let\'s show you how it works.',
  },
  {
    icon: Vote,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-500',
    title: 'Vote on Sessions',
    description: 'Use quadratic voting to support sessions you want to attend. You have 100 credits to spend - each additional vote on the same session costs more credits (1, 3, 6, 10...).',
    tip: 'Votes save automatically - no submit button needed!',
  },
  {
    icon: Heart,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-500',
    title: 'Save Your Favorites',
    description: 'Tap the heart to save sessions to "My Schedule". This is separate from voting - it\'s your personal bookmark for sessions you plan to attend.',
    tip: 'Favorites don\'t cost credits and don\'t affect voting.',
  },
  {
    icon: Mic,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-500',
    title: 'Propose a Session',
    description: 'Have something to share? Propose your own session! Choose a format (talk, workshop, discussion, panel, or demo) and submit for review.',
    tip: 'Sessions are reviewed by admins before appearing for voting.',
  },
]

export function OnboardingModal({ userId, email, onComplete }: OnboardingModalProps) {
  const [step, setStep] = React.useState(1)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Form state
  const [displayName, setDisplayName] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [avatarUrl, setAvatarUrl] = React.useState('')
  const [affiliation, setAffiliation] = React.useState('')
  const [building, setBuilding] = React.useState('')
  const [telegram, setTelegram] = React.useState('')
  const [ens, setEns] = React.useState('')
  const [interests, setInterests] = React.useState<string[]>([])
  const [customInterest, setCustomInterest] = React.useState('')

  // Total steps: 4 intro slides + 3 profile steps = 7
  const introStepCount = introSlides.length
  const profileStepCount = 3
  const totalSteps = introStepCount + profileStepCount

  const isIntroStep = step <= introStepCount
  const profileStep = step - introStepCount // 1, 2, or 3 for profile steps

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest))
    } else if (interests.length < 5) {
      setInterests([...interests, interest])
    }
  }

  const addCustomInterest = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim()) && interests.length < 5) {
      setInterests([...interests, customInterest.trim()])
      setCustomInterest('')
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    const token = getAccessToken()
    if (!token) {
      setError('Session expired. Please refresh and try again.')
      setIsSubmitting(false)
      return
    }

    // Full profile data with all fields
    const fullProfileData: Record<string, unknown> = {
      display_name: displayName || null,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      affiliation: affiliation || null,
      building: building || null,
      telegram: telegram || null,
      ens: ens || null,
      interests: interests.length > 0 ? interests : null,
      onboarding_completed: true,
    }

    // Minimal profile data (original schema only)
    const minimalProfileData = {
      display_name: displayName || null,
      bio: bio || null,
    }

    try {
      // First try with all fields
      let response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(fullProfileData),
      })

      // If 400 error (likely missing columns), retry with minimal fields
      if (response.status === 400) {
        console.log('Full update failed (400), retrying with minimal fields...')
        response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(minimalProfileData),
        })
      }

      if (response.ok || response.status === 204) {
        onComplete()
      } else {
        const errorText = await response.text()
        console.error('Profile update failed:', response.status, errorText)
        setError(`Failed to save profile. Please try again. (${response.status})`)
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    if (isIntroStep) return true
    switch (profileStep) {
      case 1:
        return displayName.trim().length >= 2
      case 2:
        return true // All optional
      case 3:
        return true // All optional
      default:
        return false
    }
  }

  // Render intro slide
  const renderIntroSlide = () => {
    const slide = introSlides[step - 1]
    const IconComponent = slide.icon

    return (
      <div className="text-center py-4">
        <div className={cn('inline-flex p-4 rounded-full mb-4', slide.iconBg)}>
          <IconComponent className={cn('h-10 w-10', slide.iconColor)} />
        </div>
        <h3 className="text-xl font-bold mb-3">{slide.title}</h3>
        <p className="text-muted-foreground mb-4">{slide.description}</p>
        {slide.tip && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <span className="font-medium">Tip:</span> {slide.tip}
          </div>
        )}
      </div>
    )
  }

  // Render profile step
  const renderProfileStep = () => {
    switch (profileStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile Photo <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <label htmlFor="photo-upload">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </span>
                    </Button>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Display Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="How should we call you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Affiliation <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="Company, DAO, or project"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Short Bio <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="One line about yourself"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                What are you building? <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="Describe your project or work"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Help others understand what you're working on
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Send className="h-4 w-4" />
                Telegram <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="@username"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Hexagon className="h-4 w-4" />
                ENS Name <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="yourname.eth"
                value={ens}
                onChange={(e) => setEns(e.target.value)}
              />
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{email}</span>
              </div>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Topics you're interested in
              </label>
              <p className="text-xs text-muted-foreground">
                Select up to 5 topics to help others find you
              </p>
            </div>

            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className="inline-flex items-center rounded-full border border-primary bg-primary/10 px-4 py-2.5 text-sm min-h-[44px] hover:bg-primary/20 transition-colors"
                  >
                    {interest}
                    <X className="h-4 w-4 ml-1.5" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {suggestedInterests
                .filter((i) => !interests.includes(i))
                .map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className="inline-flex items-center rounded-full border px-4 py-2.5 text-sm min-h-[44px] hover:bg-accent transition-colors"
                    disabled={interests.length >= 5}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {interest}
                  </button>
                ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add custom topic"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomInterest()
                  }
                }}
                className="flex-1"
                disabled={interests.length >= 5}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addCustomInterest}
                disabled={!customInterest.trim() || interests.length >= 5}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const getStepTitle = () => {
    if (isIntroStep) {
      return `How It Works (${step}/${introStepCount})`
    }
    const titles = ['Your Profile', 'Contact & Projects', 'Your Interests']
    return titles[profileStep - 1]
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-card border rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-br from-primary/10 to-transparent">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              {isIntroStep ? (
                <Calendar className="h-5 w-5 text-primary" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
            </div>
            <h2 className="text-xl font-bold">{getStepTitle()}</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            {isIntroStep
              ? 'Quick overview of how Schelling Point works'
              : 'Set up your profile so others can find and connect with you'
            }
          </p>
          {/* Progress */}
          <div className="flex gap-1 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i < step ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 min-h-[300px]">
          {isIntroStep ? renderIntroSlide() : renderProfileStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/20 space-y-3">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                {isIntroStep ? 'Next' : 'Continue'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary-glow"
              >
                {isSubmitting ? 'Saving...' : 'Get Started'}
                <Sparkles className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Skip intro option */}
          {isIntroStep && step < introStepCount && (
            <div className="text-center">
              <button
                onClick={() => setStep(introStepCount + 1)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip intro, go to profile setup →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
