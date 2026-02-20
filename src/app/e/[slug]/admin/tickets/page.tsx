'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Ticket,
  DollarSign,
  Calendar,
  Users,
  GripVertical,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AdminNav } from '@/components/admin/AdminNav'
import { useEvent, useEventRole } from '@/contexts/EventContext'
import { cn } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TicketTier {
  id: string
  name: string
  description: string | null
  price_cents: number
  currency: string
  quantity_total: number | null
  quantity_sold: number
  sale_starts_at: string | null
  sale_ends_at: string | null
  is_active: boolean
  display_order: number
  allows_proposals: boolean
  allows_voting: boolean
  vote_credits_override: number | null
}

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

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AdminTicketsPage() {
  const params = useParams()
  const eventSlug = params.slug as string
  const event = useEvent()
  const { isAdmin, can } = useEventRole()

  const [tiers, setTiers] = React.useState<TicketTier[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [editingTier, setEditingTier] = React.useState<TicketTier | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Form state
  const [formName, setFormName] = React.useState('')
  const [formDescription, setFormDescription] = React.useState('')
  const [formPrice, setFormPrice] = React.useState('')
  const [formQuantity, setFormQuantity] = React.useState('')
  const [formSaleStarts, setFormSaleStarts] = React.useState('')
  const [formSaleEnds, setFormSaleEnds] = React.useState('')
  const [formAllowsProposals, setFormAllowsProposals] = React.useState(true)
  const [formAllowsVoting, setFormAllowsVoting] = React.useState(true)

  // Fetch tiers on mount
  React.useEffect(() => {
    const fetchTiers = async () => {
      const token = getAccessToken()
      if (!token) return

      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/ticket_tiers?event_id=eq.${event.id}&order=display_order`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setTiers(data)
        }
      } catch (err) {
        console.error('Error fetching tiers:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTiers()
  }, [event.id])

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormPrice('')
    setFormQuantity('')
    setFormSaleStarts('')
    setFormSaleEnds('')
    setFormAllowsProposals(true)
    setFormAllowsVoting(true)
  }

  const openCreateForm = () => {
    resetForm()
    setEditingTier(null)
    setIsCreating(true)
  }

  const openEditForm = (tier: TicketTier) => {
    setFormName(tier.name)
    setFormDescription(tier.description || '')
    setFormPrice((tier.price_cents / 100).toString())
    setFormQuantity(tier.quantity_total?.toString() || '')
    setFormSaleStarts(tier.sale_starts_at ? tier.sale_starts_at.slice(0, 16) : '')
    setFormSaleEnds(tier.sale_ends_at ? tier.sale_ends_at.slice(0, 16) : '')
    setFormAllowsProposals(tier.allows_proposals)
    setFormAllowsVoting(tier.allows_voting)
    setEditingTier(tier)
    setIsCreating(true)
  }

  const handleSave = async () => {
    const token = getAccessToken()
    if (!token || !formName.trim()) return

    setIsSaving(true)

    try {
      const tierData = {
        event_id: event.id,
        name: formName.trim(),
        description: formDescription.trim() || null,
        price_cents: Math.round(parseFloat(formPrice || '0') * 100),
        quantity_total: formQuantity ? parseInt(formQuantity) : null,
        sale_starts_at: formSaleStarts || null,
        sale_ends_at: formSaleEnds || null,
        allows_proposals: formAllowsProposals,
        allows_voting: formAllowsVoting,
        display_order: editingTier ? editingTier.display_order : tiers.length,
      }

      if (editingTier) {
        // Update existing
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/ticket_tiers?id=eq.${editingTier.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(tierData),
          }
        )

        if (response.ok) {
          const [updated] = await response.json()
          setTiers(prev => prev.map(t => t.id === updated.id ? updated : t))
        }
      } else {
        // Create new
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/ticket_tiers`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(tierData),
          }
        )

        if (response.ok) {
          const [created] = await response.json()
          setTiers(prev => [...prev, created])
        }
      }

      setIsCreating(false)
      resetForm()
      setEditingTier(null)
    } catch (err) {
      console.error('Error saving tier:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this ticket tier?')) return

    const token = getAccessToken()
    if (!token) return

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ticket_tiers?id=eq.${tierId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        setTiers(prev => prev.filter(t => t.id !== tierId))
      }
    } catch (err) {
      console.error('Error deleting tier:', err)
    }
  }

  const toggleActive = async (tier: TicketTier) => {
    const token = getAccessToken()
    if (!token) return

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ticket_tiers?id=eq.${tier.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ is_active: !tier.is_active }),
        }
      )

      if (response.ok) {
        const [updated] = await response.json()
        setTiers(prev => prev.map(t => t.id === updated.id ? updated : t))
      }
    } catch (err) {
      console.error('Error toggling tier:', err)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav
          eventSlug={eventSlug}
          canManageSchedule={can('manageSchedule')}
          canManageVenues={can('manageVenues')}
        />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">You don&apos;t have permission to view this page.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav
        eventSlug={eventSlug}
        canManageSchedule={can('manageSchedule')}
        canManageVenues={can('manageVenues')}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Ticket Tiers</h1>
              <p className="text-muted-foreground mt-1">
                Configure ticket types and pricing
              </p>
            </div>
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Ticket className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {tiers.reduce((sum, t) => sum + t.quantity_sold, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Tickets Sold</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatPrice(
                        tiers.reduce((sum, t) => sum + (t.quantity_sold * t.price_cents), 0),
                        'usd'
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{tiers.filter(t => t.is_active).length}</p>
                    <p className="text-sm text-muted-foreground">Active Tiers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create/Edit Form */}
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle>{editingTier ? 'Edit Tier' : 'Create Tier'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g., Early Bird, General Admission"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price (USD)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="0.00 (free)"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="What's included with this ticket?"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity (leave blank for unlimited)</label>
                    <Input
                      type="number"
                      min="1"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sale Starts</label>
                    <Input
                      type="datetime-local"
                      value={formSaleStarts}
                      onChange={(e) => setFormSaleStarts(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sale Ends</label>
                    <Input
                      type="datetime-local"
                      value={formSaleEnds}
                      onChange={(e) => setFormSaleEnds(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-sm font-medium">Permissions</label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formAllowsProposals}
                          onChange={(e) => setFormAllowsProposals(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">Can propose sessions</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formAllowsVoting}
                          onChange={(e) => setFormAllowsVoting(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">Can vote on sessions</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false)
                      resetForm()
                      setEditingTier(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving || !formName.trim()}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingTier ? 'Save Changes' : 'Create Tier'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tiers List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tiers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold mb-2">No ticket tiers yet</h2>
                <p className="text-muted-foreground mb-4">
                  Create your first ticket tier to start selling tickets.
                </p>
                <Button onClick={openCreateForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Tier
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tiers.map((tier) => (
                <Card
                  key={tier.id}
                  className={cn(!tier.is_active && 'opacity-60')}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="cursor-grab text-muted-foreground">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{tier.name}</h3>
                          {!tier.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          {tier.price_cents === 0 && (
                            <Badge variant="outline" className="text-green-600">Free</Badge>
                          )}
                        </div>
                        {tier.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{tier.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {formatPrice(tier.price_cents, tier.currency)}
                          </span>
                          <span>
                            {tier.quantity_sold}
                            {tier.quantity_total ? ` / ${tier.quantity_total}` : ''} sold
                          </span>
                          {tier.sale_starts_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(tier.sale_starts_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(tier)}
                          title={tier.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {tier.is_active ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(tier)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tier.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
