'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, MapPin, Users, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WizardState, WizardAction, WizardVenue } from '../useWizardState';

// ============================================================================
// Types
// ============================================================================

interface VenuesStepProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

interface VenueFormData {
  name: string;
  capacity: string;
  features: string[];
  address: string;
}

// ============================================================================
// Constants
// ============================================================================

const VENUE_FEATURES = [
  { value: 'projector', label: 'Projector' },
  { value: 'microphone', label: 'Microphone' },
  { value: 'whiteboard', label: 'Whiteboard' },
  { value: 'video-conferencing', label: 'Video Conferencing' },
  { value: 'accessible', label: 'Accessible' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'wifi', label: 'WiFi' },
];

const INITIAL_FORM_DATA: VenueFormData = {
  name: '',
  capacity: '',
  features: [],
  address: '',
};

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================================
// Venue Card Component
// ============================================================================

interface VenueCardProps {
  venue: WizardVenue;
  onEdit: (venue: WizardVenue) => void;
  onDelete: (id: string) => void;
}

function VenueCard({ venue, onEdit, onDelete }: VenueCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const handleDelete = () => {
    onDelete(venue.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-base truncate">{venue.name}</h4>
          {venue.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{venue.address}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(venue)}
            aria-label={`Edit ${venue.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label={`Delete ${venue.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Capacity */}
      {venue.capacity !== null && venue.capacity > 0 && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Capacity: {venue.capacity}
        </p>
      )}

      {/* Features */}
      {venue.features.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {venue.features.map((feature) => (
            <Badge key={feature} variant="secondary" className="text-xs">
              {VENUE_FEATURES.find((f) => f.value === feature)?.label || feature}
            </Badge>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-2">
          <p className="text-sm text-destructive">
            Are you sure you want to delete this venue? This will also remove any time slots assigned to it.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Venue Form Component
// ============================================================================

interface VenueFormProps {
  initialData?: WizardVenue | null;
  onSubmit: (data: VenueFormData) => void;
  onCancel: () => void;
  isEditing: boolean;
}

function VenueForm({ initialData, onSubmit, onCancel, isEditing }: VenueFormProps) {
  const [formData, setFormData] = React.useState<VenueFormData>(() => {
    if (initialData) {
      return {
        name: initialData.name,
        capacity: initialData.capacity !== null ? String(initialData.capacity) : '',
        features: initialData.features,
        address: initialData.address,
      };
    }
    return INITIAL_FORM_DATA;
  });

  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Venue name is required');
      return;
    }

    setError(null);
    onSubmit(formData);
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Venue Name */}
      <div className="space-y-2">
        <Label htmlFor="venue-name">
          Venue Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="venue-name"
          placeholder="e.g., Main Stage, Workshop Room A"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          maxLength={100}
          error={!!error && !formData.name.trim()}
        />
      </div>

      {/* Capacity */}
      <div className="space-y-2">
        <Label htmlFor="venue-capacity">Capacity</Label>
        <Input
          id="venue-capacity"
          type="number"
          placeholder="Maximum number of attendees"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
          min={0}
          max={100000}
        />
      </div>

      {/* Features */}
      <div className="space-y-2">
        <Label>Features</Label>
        <div className="flex flex-wrap gap-2">
          {VENUE_FEATURES.map((feature) => (
            <button
              key={feature.value}
              type="button"
              onClick={() => handleFeatureToggle(feature.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
                formData.features.includes(feature.value)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              )}
            >
              {feature.label}
            </button>
          ))}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="venue-address">Address</Label>
        <Input
          id="venue-address"
          placeholder="Physical address or location details"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          maxLength={300}
        />
        <p className="text-xs text-muted-foreground">
          For in-person venues, add an address to help attendees find it
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit">
          {isEditing ? 'Update Venue' : 'Add Venue'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function VenuesStep({ state, dispatch }: VenuesStepProps) {
  const { venues, dates } = state;
  const [showForm, setShowForm] = React.useState(false);
  const [editingVenue, setEditingVenue] = React.useState<WizardVenue | null>(null);

  const isVirtualOnly = dates.locationType === 'virtual';

  const handleAddVenue = () => {
    setEditingVenue(null);
    setShowForm(true);
  };

  const handleEditVenue = (venue: WizardVenue) => {
    setEditingVenue(venue);
    setShowForm(true);
  };

  const handleDeleteVenue = (id: string) => {
    dispatch({ type: 'REMOVE_VENUE', payload: id });
  };

  const handleFormSubmit = (data: VenueFormData) => {
    const venueData: WizardVenue = {
      id: editingVenue?.id || generateId(),
      name: data.name.trim(),
      capacity: data.capacity ? parseInt(data.capacity, 10) : null,
      features: data.features,
      address: data.address.trim(),
    };

    if (editingVenue) {
      dispatch({
        type: 'UPDATE_VENUE',
        payload: { id: editingVenue.id, updates: venueData },
      });
    } else {
      dispatch({ type: 'ADD_VENUE', payload: venueData });
    }

    setShowForm(false);
    setEditingVenue(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingVenue(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Venues</CardTitle>
          <CardDescription>
            {isVirtualOnly
              ? 'Your event is virtual, but you can still add venues for hybrid sessions'
              : 'Add the physical or virtual spaces where sessions will take place'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Virtual event notice */}
          {isVirtualOnly && (
            <div className="rounded-lg bg-muted/50 border p-4 text-sm text-muted-foreground">
              <p>
                Since this is a virtual event, venues are optional. You can add them later if you
                decide to include in-person components.
              </p>
            </div>
          )}

          {/* Venue List */}
          {venues.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {venues.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  onEdit={handleEditVenue}
                  onDelete={handleDeleteVenue}
                />
              ))}
            </div>
          ) : (
            !showForm && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-4">
                  No venues added yet. Add your first venue to get started.
                </p>
                <Button onClick={handleAddVenue}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Venue
                </Button>
              </div>
            )
          )}

          {/* Add Venue Button (when venues exist) */}
          {venues.length > 0 && !showForm && (
            <Button onClick={handleAddVenue} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Venue
            </Button>
          )}

          {/* Venue Form */}
          {showForm && (
            <Card className="border-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {editingVenue ? 'Edit Venue' : 'New Venue'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleFormCancel}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <VenueForm
                  initialData={editingVenue}
                  onSubmit={handleFormSubmit}
                  onCancel={handleFormCancel}
                  isEditing={!!editingVenue}
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips for Venues</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Capacity:</strong> Set realistic capacities to help manage session attendance.
          </p>
          <p>
            <strong>Features:</strong> Tag venues with available equipment so session hosts know what is available.
          </p>
          <p>
            <strong>Naming:</strong> Use descriptive names that are easy for attendees to find (e.g., Building A - Room 101).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default VenuesStep;
