'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { EVENT_TEMPLATES, type EventTemplate } from '@/lib/events/templates'
import {
  Users,
  Presentation,
  Code,
  Coffee,
  Check,
  FileQuestion,
  type LucideIcon,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface TemplateSelectorProps {
  selectedTemplateId: string | null
  onSelect: (templateId: string | null) => void
}

// ============================================================================
// Icon Mapping
// ============================================================================

const iconMap: Record<string, LucideIcon> = {
  Users,
  Presentation,
  Code,
  Coffee,
}

function getTemplateIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || FileQuestion
}

// ============================================================================
// Template Card Component
// ============================================================================

interface TemplateCardProps {
  template: EventTemplate | null // null = "Start from scratch"
  isSelected: boolean
  onSelect: () => void
  index: number
  totalItems: number
  onKeyNavigation: (direction: 'left' | 'right' | 'up' | 'down') => void
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  index,
  totalItems,
  onKeyNavigation,
}: TemplateCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        onSelect()
        break
      case 'ArrowLeft':
        e.preventDefault()
        onKeyNavigation('left')
        break
      case 'ArrowRight':
        e.preventDefault()
        onKeyNavigation('right')
        break
      case 'ArrowUp':
        e.preventDefault()
        onKeyNavigation('up')
        break
      case 'ArrowDown':
        e.preventDefault()
        onKeyNavigation('down')
        break
    }
  }

  // Focus management for keyboard navigation
  React.useEffect(() => {
    // This effect allows parent to focus the card via ref
  }, [])

  const Icon = template ? getTemplateIcon(template.icon) : FileQuestion

  return (
    <Card
      ref={cardRef}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-primary/50',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'group',
        isSelected && [
          'border-primary border-2',
          'bg-primary/5',
          'shadow-md shadow-primary/10',
        ]
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      <CardContent className="p-5">
        <div className="space-y-3">
          {/* Icon */}
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center transition-colors',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
            )}
          >
            <Icon className="h-6 w-6" />
          </div>

          {/* Name */}
          <h3
            className={cn(
              'font-semibold text-lg transition-colors',
              isSelected && 'text-primary'
            )}
          >
            {template ? template.name : 'Start from Scratch'}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3.75rem]">
            {template
              ? template.description
              : 'Build your event from the ground up with complete control over every setting.'}
          </p>

          {/* Template details hint */}
          {template && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {template.defaults.tracks?.length || 0} tracks configured
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function TemplateSelector({
  selectedTemplateId,
  onSelect,
}: TemplateSelectorProps) {
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([])

  // All options: "Start from scratch" (null) + templates
  const allOptions: (EventTemplate | null)[] = [null, ...EVENT_TEMPLATES]

  // Find currently focused index
  const [focusedIndex, setFocusedIndex] = React.useState(-1)

  // Calculate the current column count based on container width
  const [columns, setColumns] = React.useState(2)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const updateColumns = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        // Match the grid breakpoints:
        // Default: 1 col, sm (640px): 2 cols, lg (1024px): could be more
        // We use 2 on mobile, then potentially more on larger screens
        if (width >= 1024) {
          setColumns(4) // lg: 4 columns (with "start from scratch" taking 1)
        } else if (width >= 640) {
          setColumns(2)
        } else {
          setColumns(1)
        }
      }
    }

    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  const handleKeyNavigation = (
    currentIndex: number,
    direction: 'left' | 'right' | 'up' | 'down'
  ) => {
    let newIndex = currentIndex

    switch (direction) {
      case 'left':
        newIndex = Math.max(0, currentIndex - 1)
        break
      case 'right':
        newIndex = Math.min(allOptions.length - 1, currentIndex + 1)
        break
      case 'up':
        newIndex = Math.max(0, currentIndex - columns)
        break
      case 'down':
        newIndex = Math.min(allOptions.length - 1, currentIndex + columns)
        break
    }

    if (newIndex !== currentIndex) {
      setFocusedIndex(newIndex)
      cardRefs.current[newIndex]?.focus()
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Choose a Template</h2>
        <p className="text-sm text-muted-foreground">
          Start with a pre-configured template or build from scratch
        </p>
      </div>

      <div
        ref={containerRef}
        role="listbox"
        aria-label="Event templates"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {allOptions.map((option, index) => {
          const templateId = option?.id ?? null
          const isSelected = selectedTemplateId === templateId

          return (
            <div
              key={templateId ?? 'scratch'}
              ref={(el) => {
                cardRefs.current[index] = el
              }}
            >
              <TemplateCard
                template={option}
                isSelected={isSelected}
                onSelect={() => onSelect(templateId)}
                index={index}
                totalItems={allOptions.length}
                onKeyNavigation={(direction) =>
                  handleKeyNavigation(index, direction)
                }
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TemplateSelector
