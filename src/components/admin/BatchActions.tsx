'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  X,
  Tag,
  Trash2,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Track {
  id: string
  name: string
  color: string
}

interface BatchActionsProps {
  selectedCount: number
  tracks?: Track[]
  onApprove?: () => void
  onReject?: (reason?: string) => void
  onAssignTrack?: (trackId: string) => void
  onDelete?: () => void
  onClearSelection: () => void
  isLoading?: boolean
  allowedActions?: ('approve' | 'reject' | 'assign_track' | 'delete')[]
}

export function BatchActions({
  selectedCount,
  tracks = [],
  onApprove,
  onReject,
  onAssignTrack,
  onDelete,
  onClearSelection,
  isLoading = false,
  allowedActions = ['approve', 'reject', 'assign_track', 'delete'],
}: BatchActionsProps) {
  const [showTrackMenu, setShowTrackMenu] = React.useState(false)
  const [showRejectDialog, setShowRejectDialog] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState('')
  const trackMenuRef = React.useRef<HTMLDivElement>(null)

  // Close track menu on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (trackMenuRef.current && !trackMenuRef.current.contains(e.target as Node)) {
        setShowTrackMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleReject = () => {
    onReject?.(rejectReason.trim() || undefined)
    setShowRejectDialog(false)
    setRejectReason('')
  }

  const handleDelete = () => {
    onDelete?.()
    setShowDeleteConfirm(false)
  }

  if (selectedCount === 0) return null

  return (
    <>
      {/* Floating Toolbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-2 bg-card border shadow-lg rounded-full px-4 py-2">
          {/* Selection Count */}
          <Badge variant="secondary" className="text-sm font-medium">
            {selectedCount} selected
          </Badge>

          <div className="w-px h-6 bg-border" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {allowedActions.includes('approve') && onApprove && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onApprove}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Check className="h-4 w-4 text-green-600" />
                <span className="hidden sm:inline">Approve</span>
              </Button>
            )}

            {allowedActions.includes('reject') && onReject && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowRejectDialog(true)}
                disabled={isLoading}
                className="gap-1.5"
              >
                <X className="h-4 w-4 text-red-600" />
                <span className="hidden sm:inline">Reject</span>
              </Button>
            )}

            {allowedActions.includes('assign_track') && onAssignTrack && tracks.length > 0 && (
              <div className="relative" ref={trackMenuRef}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowTrackMenu(!showTrackMenu)}
                  disabled={isLoading}
                  className="gap-1.5"
                >
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">Track</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>

                {showTrackMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-popover border rounded-lg shadow-lg p-1 animate-in slide-in-from-bottom-2">
                    {tracks.map((track) => (
                      <button
                        key={track.id}
                        onClick={() => {
                          onAssignTrack(track.id)
                          setShowTrackMenu(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: track.color }}
                        />
                        {track.name}
                      </button>
                    ))}
                    <div className="border-t my-1" />
                    <button
                      onClick={() => {
                        onAssignTrack('')
                        setShowTrackMenu(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-muted-foreground"
                    >
                      Clear track
                    </button>
                  </div>
                )}
              </div>
            )}

            {allowedActions.includes('delete') && onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Clear Selection */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isLoading}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </Button>

          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setShowRejectDialog(false)}
        >
          <div
            className="w-full max-w-md bg-card border rounded-xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-2">Reject {selectedCount} Session{selectedCount > 1 ? 's' : ''}?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Optionally provide a reason for rejection (will be included in notification).
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm mb-4 min-h-[80px]"
              maxLength={500}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setShowRejectDialog(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={handleReject}
              >
                Reject {selectedCount > 1 ? 'All' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-card border rounded-xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-2">Delete {selectedCount} Session{selectedCount > 1 ? 's' : ''}?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. All associated votes will also be deleted.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
              >
                Delete {selectedCount > 1 ? 'All' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
