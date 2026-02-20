'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SessionStatus = 'pending' | 'approved' | 'rejected' | 'scheduled'

interface Track {
  id: string
  name: string
  color: string
}

interface FilterState {
  search: string
  statuses: SessionStatus[]
  tracks: string[]
  formats: string[]
  minVotes: number | null
  maxVotes: number | null
  hasTimePreference: boolean | null
  hasCohosts: boolean | null
}

interface SessionFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  tracks?: Track[]
  formats?: string[]
  totalCount: number
  filteredCount: number
}

export const defaultFilters: FilterState = {
  search: '',
  statuses: [],
  tracks: [],
  formats: [],
  minVotes: null,
  maxVotes: null,
  hasTimePreference: null,
  hasCohosts: null,
}

export function SessionFilters({
  filters,
  onFiltersChange,
  tracks = [],
  formats = [],
  totalCount,
  filteredCount,
}: SessionFiltersProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState(filters.search)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFiltersChange({ ...filters, search: searchValue })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue, filters, onFiltersChange])

  const activeFilterCount = [
    filters.statuses.length > 0,
    filters.tracks.length > 0,
    filters.formats.length > 0,
    filters.minVotes !== null || filters.maxVotes !== null,
    filters.hasTimePreference !== null,
    filters.hasCohosts !== null,
  ].filter(Boolean).length

  const toggleStatus = (status: SessionStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onFiltersChange({ ...filters, statuses: newStatuses })
  }

  const toggleTrack = (trackId: string) => {
    const newTracks = filters.tracks.includes(trackId)
      ? filters.tracks.filter((t) => t !== trackId)
      : [...filters.tracks, trackId]
    onFiltersChange({ ...filters, tracks: newTracks })
  }

  const toggleFormat = (format: string) => {
    const newFormats = filters.formats.includes(format)
      ? filters.formats.filter((f) => f !== format)
      : [...filters.formats, format]
    onFiltersChange({ ...filters, formats: newFormats })
  }

  const clearAllFilters = () => {
    setSearchValue('')
    onFiltersChange(defaultFilters)
  }

  const hasActiveFilters = searchValue || activeFilterCount > 0

  const statusOptions: SessionStatus[] = ['pending', 'approved', 'scheduled', 'rejected']

  return (
    <div className="space-y-3">
      {/* Search Bar Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title, host, or tags..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchValue && (
            <button
              onClick={() => setSearchValue('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          variant={isExpanded || activeFilterCount > 0 ? 'secondary' : 'outline'}
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 justify-center">
              {activeFilterCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Filter Results Summary */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {filteredCount} of {totalCount} sessions
          </span>
          <button
            onClick={clearAllFilters}
            className="text-primary hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="bg-muted/50 border rounded-lg p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors capitalize',
                    filters.statuses.includes(status)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Track Filter */}
          {tracks.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Track</label>
              <div className="flex flex-wrap gap-2">
                {tracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => toggleTrack(track.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1.5',
                      filters.tracks.includes(track.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    )}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: track.color }}
                    />
                    {track.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Format Filter */}
          {formats.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <div className="flex flex-wrap gap-2">
                {formats.map((format) => (
                  <button
                    key={format}
                    onClick={() => toggleFormat(format)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm border transition-colors capitalize',
                      filters.formats.includes(format)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    )}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vote Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Vote Count</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minVotes ?? ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    minVotes: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-24"
                min={0}
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxVotes ?? ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    maxVotes: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-24"
                min={0}
              />
            </div>
          </div>

          {/* Boolean Filters */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasTimePreference === true}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    hasTimePreference: e.target.checked ? true : null,
                  })
                }
                className="rounded border-input"
              />
              Has time preference
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasCohosts === true}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    hasCohosts: e.target.checked ? true : null,
                  })
                }
                className="rounded border-input"
              />
              Has co-hosts
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
