'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import type { WizardState, WizardAction, WizardTrack } from '../useWizardState';

// ============================================================================
// Types
// ============================================================================

interface TracksStepProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

interface TrackFormData {
  name: string;
  color: string;
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

const PRESET_COLORS = [
  { value: '#3B82F6', name: 'Blue' },
  { value: '#10B981', name: 'Emerald' },
  { value: '#F59E0B', name: 'Amber' },
  { value: '#EF4444', name: 'Red' },
  { value: '#8B5CF6', name: 'Violet' },
  { value: '#EC4899', name: 'Pink' },
  { value: '#06B6D4', name: 'Cyan' },
  { value: '#84CC16', name: 'Lime' },
];

const INITIAL_FORM_DATA: TrackFormData = {
  name: '',
  color: PRESET_COLORS[0].value,
  description: '',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a UUID for client-side track identification
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get contrasting text color (black or white) for a given background color
 */
function getContrastingTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Validate hex color format
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customValue, setCustomValue] = React.useState(value);

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Ensure it starts with #
    if (!newValue.startsWith('#')) {
      newValue = '#' + newValue;
    }

    // Limit to 7 characters (#RRGGBB)
    newValue = newValue.substring(0, 7).toUpperCase();

    setCustomValue(newValue);

    // Only update parent if valid
    if (isValidHexColor(newValue)) {
      onChange(newValue);
    }
  };

  const handleCustomInputBlur = () => {
    // Reset to current value if invalid
    if (!isValidHexColor(customValue)) {
      setCustomValue(value);
    }
  };

  const isPresetColor = PRESET_COLORS.some((c) => c.value === value);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => {
              onChange(color.value);
              setCustomValue(color.value);
              setShowCustomInput(false);
            }}
            className={cn(
              'w-8 h-8 rounded-full border-2 transition-all',
              'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              value === color.value
                ? 'border-foreground ring-2 ring-ring ring-offset-2'
                : 'border-transparent'
            )}
            style={{ backgroundColor: color.value }}
            title={color.name}
            aria-label={`Select ${color.name} color`}
          />
        ))}
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className={cn(
            'w-8 h-8 rounded-full border-2 border-dashed transition-all',
            'hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'flex items-center justify-center text-muted-foreground',
            showCustomInput || (!isPresetColor && value)
              ? 'border-primary text-primary'
              : 'border-muted-foreground'
          )}
          title="Custom color"
          aria-label="Enter custom color"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {(showCustomInput || (!isPresetColor && value)) && (
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded border flex-shrink-0"
            style={{ backgroundColor: isValidHexColor(customValue) ? customValue : value }}
          />
          <Input
            type="text"
            value={customValue}
            onChange={handleCustomInputChange}
            onBlur={handleCustomInputBlur}
            placeholder="#RRGGBB"
            className="font-mono w-28"
            maxLength={7}
          />
        </div>
      )}
    </div>
  );
}

interface TrackCardProps {
  track: WizardTrack;
  onEdit: () => void;
  onDelete: () => void;
}

function TrackCard({ track, onEdit, onDelete }: TrackCardProps) {
  const textColor = getContrastingTextColor(track.color);

  return (
    <div
      className={cn(
        'flex items-start justify-between p-4 rounded-lg border',
        'bg-card hover:bg-accent/50 transition-colors'
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium"
          style={{
            backgroundColor: track.color,
            color: textColor,
          }}
        >
          {track.name}
        </div>
        {track.description && (
          <p className="text-sm text-muted-foreground truncate pt-1">
            {track.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8"
          aria-label={`Edit ${track.name} track`}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-destructive hover:text-destructive"
          aria-label={`Delete ${track.name} track`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface TrackFormProps {
  initialData?: TrackFormData;
  onSubmit: (data: TrackFormData) => void;
  onCancel: () => void;
  submitLabel: string;
}

function TrackForm({ initialData, onSubmit, onCancel, submitLabel }: TrackFormProps) {
  const [formData, setFormData] = React.useState<TrackFormData>(
    initialData || INITIAL_FORM_DATA
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSubmit({
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
      });
    }
  };

  const isValid = formData.name.trim().length > 0 && isValidHexColor(formData.color);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-accent/30">
      <div className="space-y-2">
        <Label htmlFor="track-name">
          Track Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="track-name"
          placeholder="e.g., Technical, Design, Business"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          maxLength={50}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>
          Color <span className="text-destructive">*</span>
        </Label>
        <ColorPicker
          value={formData.color}
          onChange={(color) => setFormData({ ...formData, color })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="track-description">Description</Label>
        <Textarea
          id="track-description"
          placeholder="What kind of sessions belong in this track?"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="min-h-[80px]"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid}>
          <Check className="w-4 h-4 mr-2" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TracksStep({ state, dispatch }: TracksStepProps) {
  const { tracks } = state;

  // Form state
  const [isAddingTrack, setIsAddingTrack] = React.useState(false);
  const [editingTrackId, setEditingTrackId] = React.useState<string | null>(null);

  // Handlers
  const handleAddTrack = (data: TrackFormData) => {
    dispatch({
      type: 'ADD_TRACK',
      payload: {
        id: generateId(),
        name: data.name,
        color: data.color,
        description: data.description,
      },
    });
    setIsAddingTrack(false);
  };

  const handleUpdateTrack = (id: string, data: TrackFormData) => {
    dispatch({
      type: 'UPDATE_TRACK',
      payload: {
        id,
        updates: {
          name: data.name,
          color: data.color,
          description: data.description,
        },
      },
    });
    setEditingTrackId(null);
  };

  const handleRemoveTrack = (id: string) => {
    dispatch({ type: 'REMOVE_TRACK', payload: id });
  };

  const editingTrack = editingTrackId
    ? tracks.find((t) => t.id === editingTrackId)
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Tracks</CardTitle>
          <CardDescription>
            Tracks help organize sessions by theme or topic. Attendees can filter sessions by track
            to find content that interests them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tracks List */}
          {tracks.length > 0 ? (
            <div className="space-y-2">
              {tracks.map((track) =>
                editingTrackId === track.id && editingTrack ? (
                  <TrackForm
                    key={track.id}
                    initialData={{
                      name: editingTrack.name,
                      color: editingTrack.color,
                      description: editingTrack.description,
                    }}
                    onSubmit={(data) => handleUpdateTrack(track.id, data)}
                    onCancel={() => setEditingTrackId(null)}
                    submitLabel="Save Changes"
                  />
                ) : (
                  <TrackCard
                    key={track.id}
                    track={track}
                    onEdit={() => {
                      setEditingTrackId(track.id);
                      setIsAddingTrack(false);
                    }}
                    onDelete={() => handleRemoveTrack(track.id)}
                  />
                )
              )}
            </div>
          ) : (
            !isAddingTrack && (
              <div className="text-center py-8 px-4 border border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  No tracks defined. Tracks help organize sessions by theme or topic.
                </p>
              </div>
            )
          )}

          {/* Add Track Form */}
          {isAddingTrack ? (
            <TrackForm
              onSubmit={handleAddTrack}
              onCancel={() => setIsAddingTrack(false)}
              submitLabel="Add Track"
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddingTrack(true);
                setEditingTrackId(null);
              }}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Track
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      {tracks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Track Preview</CardTitle>
            <CardDescription>
              How your tracks will appear to attendees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: track.color,
                    color: getContrastingTextColor(track.color),
                  }}
                >
                  {track.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TracksStep;
