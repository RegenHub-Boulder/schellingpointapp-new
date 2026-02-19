'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, Clock, Calendar, MapPin, X, Zap, Coffee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WizardState, WizardAction, WizardTimeSlot, WizardVenue } from '../useWizardState';

// ============================================================================
// Types
// ============================================================================

interface ScheduleStepProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

interface TimeSlotFormData {
  dayDate: string;
  startTime: string;
  endTime: string;
  venueId: string;
  label: string;
  isBreak: boolean;
}

interface BulkGeneratorFormData {
  dayDate: string;
  startHour: number;
  endHour: number;
  durationMinutes: number;
  venueId: string;
  includeBreaks: boolean;
  breakDuration: number;
}

// ============================================================================
// Constants
// ============================================================================

const INITIAL_FORM_DATA: TimeSlotFormData = {
  dayDate: '',
  startTime: '09:00',
  endTime: '10:00',
  venueId: '',
  label: '',
  isBreak: false,
};

const INITIAL_BULK_DATA: BulkGeneratorFormData = {
  dayDate: '',
  startHour: 9,
  endHour: 17,
  durationMinutes: 60,
  venueId: '',
  includeBreaks: false,
  breakDuration: 15,
};

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function getEventDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function slotsOverlap(slot1: WizardTimeSlot, slot2: WizardTimeSlot): boolean {
  if (slot1.dayDate !== slot2.dayDate || slot1.venueId !== slot2.venueId) {
    return false;
  }

  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);

  return start1 < end2 && start2 < end1;
}

function validateTimeSlot(
  formData: TimeSlotFormData,
  existingSlots: WizardTimeSlot[],
  editingId: string | null,
  eventStartDate: string,
  eventEndDate: string
): string[] {
  const errors: string[] = [];

  if (!formData.dayDate) {
    errors.push('Date is required');
  } else {
    if (formData.dayDate < eventStartDate || formData.dayDate > eventEndDate) {
      errors.push('Date must be within the event date range');
    }
  }

  if (!formData.startTime) {
    errors.push('Start time is required');
  }

  if (!formData.endTime) {
    errors.push('End time is required');
  }

  if (formData.startTime && formData.endTime) {
    if (timeToMinutes(formData.endTime) <= timeToMinutes(formData.startTime)) {
      errors.push('End time must be after start time');
    }
  }

  if (!formData.venueId) {
    errors.push('Venue is required');
  }

  // Check for overlapping slots
  if (formData.dayDate && formData.startTime && formData.endTime && formData.venueId) {
    const newSlot: WizardTimeSlot = {
      id: editingId || 'temp',
      ...formData,
    };

    const overlapping = existingSlots.find(
      (slot) => slot.id !== editingId && slotsOverlap(slot, newSlot)
    );

    if (overlapping) {
      errors.push(`This time slot overlaps with an existing slot (${formatTime(overlapping.startTime)} - ${formatTime(overlapping.endTime)})`);
    }
  }

  return errors;
}

// ============================================================================
// Time Slot Card Component
// ============================================================================

interface TimeSlotCardProps {
  slot: WizardTimeSlot;
  venue: WizardVenue | undefined;
  onEdit: (slot: WizardTimeSlot) => void;
  onDelete: (id: string) => void;
}

function TimeSlotCard({ slot, venue, onEdit, onDelete }: TimeSlotCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const handleDelete = () => {
    onDelete(slot.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2',
        slot.isBreak ? 'bg-muted/50 border-dashed' : 'bg-card'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
            </span>
            {slot.isBreak && (
              <Badge variant="secondary" className="text-xs">
                <Coffee className="h-3 w-3 mr-1" />
                Break
              </Badge>
            )}
          </div>
          {slot.label && (
            <p className="text-sm text-muted-foreground mt-0.5">{slot.label}</p>
          )}
          {venue && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {venue.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(slot)}
            aria-label="Edit time slot"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete time slot"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-2 space-y-2">
          <p className="text-xs text-destructive">Delete this time slot?</p>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={handleDelete}>
              Delete
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Time Slot Form Component
// ============================================================================

interface TimeSlotFormProps {
  initialData?: WizardTimeSlot | null;
  venues: WizardVenue[];
  eventDates: string[];
  existingSlots: WizardTimeSlot[];
  eventStartDate: string;
  eventEndDate: string;
  onSubmit: (data: TimeSlotFormData) => void;
  onCancel: () => void;
  isEditing: boolean;
}

function TimeSlotForm({
  initialData,
  venues,
  eventDates,
  existingSlots,
  eventStartDate,
  eventEndDate,
  onSubmit,
  onCancel,
  isEditing,
}: TimeSlotFormProps) {
  const [formData, setFormData] = React.useState<TimeSlotFormData>(() => {
    if (initialData) {
      return {
        dayDate: initialData.dayDate,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        venueId: initialData.venueId,
        label: initialData.label,
        isBreak: initialData.isBreak,
      };
    }
    return {
      ...INITIAL_FORM_DATA,
      dayDate: eventDates[0] || '',
      venueId: venues[0]?.id || '',
    };
  });

  const [errors, setErrors] = React.useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateTimeSlot(
      formData,
      existingSlots,
      initialData?.id || null,
      eventStartDate,
      eventEndDate
    );

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.length > 0 && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive space-y-1">
          {errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </div>
      )}

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="slot-date">
          Date <span className="text-destructive">*</span>
        </Label>
        <select
          id="slot-date"
          value={formData.dayDate}
          onChange={(e) => setFormData({ ...formData, dayDate: e.target.value })}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <option value="">Select date...</option>
          {eventDates.map((date) => (
            <option key={date} value={date}>
              {formatDate(date)}
            </option>
          ))}
        </select>
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="slot-start-time">
            Start Time <span className="text-destructive">*</span>
          </Label>
          <Input
            id="slot-start-time"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slot-end-time">
            End Time <span className="text-destructive">*</span>
          </Label>
          <Input
            id="slot-end-time"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          />
        </div>
      </div>

      {/* Venue */}
      <div className="space-y-2">
        <Label htmlFor="slot-venue">
          Venue <span className="text-destructive">*</span>
        </Label>
        <select
          id="slot-venue"
          value={formData.venueId}
          onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <option value="">Select venue...</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name} {venue.capacity ? `(${venue.capacity} capacity)` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="slot-label">Label (optional)</Label>
        <Input
          id="slot-label"
          placeholder="e.g., Morning Sessions, Keynote Slot"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          maxLength={100}
        />
      </div>

      {/* Is Break */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={formData.isBreak}
          onClick={() => setFormData({ ...formData, isBreak: !formData.isBreak })}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            formData.isBreak ? 'bg-primary' : 'bg-input'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
              formData.isBreak ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
        <Label className="cursor-pointer" onClick={() => setFormData({ ...formData, isBreak: !formData.isBreak })}>
          Mark as break/meal time
        </Label>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit">{isEditing ? 'Update Time Slot' : 'Add Time Slot'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Bulk Generator Component
// ============================================================================

interface BulkGeneratorProps {
  venues: WizardVenue[];
  eventDates: string[];
  existingSlots: WizardTimeSlot[];
  onGenerate: (slots: Omit<WizardTimeSlot, 'id'>[]) => void;
  onCancel: () => void;
}

function BulkGenerator({ venues, eventDates, existingSlots, onGenerate, onCancel }: BulkGeneratorProps) {
  const [formData, setFormData] = React.useState<BulkGeneratorFormData>({
    ...INITIAL_BULK_DATA,
    dayDate: eventDates[0] || '',
    venueId: venues[0]?.id || '',
  });

  const [preview, setPreview] = React.useState<Omit<WizardTimeSlot, 'id'>[]>([]);

  // Generate preview when form changes
  React.useEffect(() => {
    if (!formData.dayDate || !formData.venueId) {
      setPreview([]);
      return;
    }

    const slots: Omit<WizardTimeSlot, 'id'>[] = [];
    let currentMinutes = formData.startHour * 60;
    const endMinutes = formData.endHour * 60;

    while (currentMinutes + formData.durationMinutes <= endMinutes) {
      const startTime = minutesToTime(currentMinutes);
      const slotEndMinutes = currentMinutes + formData.durationMinutes;
      const endTime = minutesToTime(slotEndMinutes);

      // Check if this would overlap with existing slots
      const wouldOverlap = existingSlots.some((existing) => {
        if (existing.dayDate !== formData.dayDate || existing.venueId !== formData.venueId) {
          return false;
        }
        const existStart = timeToMinutes(existing.startTime);
        const existEnd = timeToMinutes(existing.endTime);
        return currentMinutes < existEnd && slotEndMinutes > existStart;
      });

      if (!wouldOverlap) {
        slots.push({
          dayDate: formData.dayDate,
          startTime,
          endTime,
          venueId: formData.venueId,
          label: '',
          isBreak: false,
        });
      }

      currentMinutes = slotEndMinutes;

      // Add break if enabled
      if (formData.includeBreaks && currentMinutes + formData.durationMinutes <= endMinutes) {
        const breakStart = minutesToTime(currentMinutes);
        const breakEndMinutes = currentMinutes + formData.breakDuration;
        const breakEnd = minutesToTime(breakEndMinutes);

        // Check if break would overlap
        const breakWouldOverlap = existingSlots.some((existing) => {
          if (existing.dayDate !== formData.dayDate || existing.venueId !== formData.venueId) {
            return false;
          }
          const existStart = timeToMinutes(existing.startTime);
          const existEnd = timeToMinutes(existing.endTime);
          return currentMinutes < existEnd && breakEndMinutes > existStart;
        });

        if (!breakWouldOverlap) {
          slots.push({
            dayDate: formData.dayDate,
            startTime: breakStart,
            endTime: breakEnd,
            venueId: formData.venueId,
            label: 'Break',
            isBreak: true,
          });
        }

        currentMinutes = breakEndMinutes;
      }
    }

    setPreview(slots);
  }, [formData, existingSlots]);

  const handleGenerate = () => {
    onGenerate(preview);
  };

  const selectedVenue = venues.find((v) => v.id === formData.venueId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="bulk-date">Date</Label>
          <select
            id="bulk-date"
            value={formData.dayDate}
            onChange={(e) => setFormData({ ...formData, dayDate: e.target.value })}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          >
            {eventDates.map((date) => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </select>
        </div>

        {/* Venue */}
        <div className="space-y-2">
          <Label htmlFor="bulk-venue">Venue</Label>
          <select
            id="bulk-venue"
            value={formData.venueId}
            onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          >
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>

        {/* Start Hour */}
        <div className="space-y-2">
          <Label htmlFor="bulk-start">Start Hour</Label>
          <select
            id="bulk-start"
            value={formData.startHour}
            onChange={(e) => setFormData({ ...formData, startHour: Number(e.target.value) })}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {formatTime(`${i.toString().padStart(2, '0')}:00`)}
              </option>
            ))}
          </select>
        </div>

        {/* End Hour */}
        <div className="space-y-2">
          <Label htmlFor="bulk-end">End Hour</Label>
          <select
            id="bulk-end"
            value={formData.endHour}
            onChange={(e) => setFormData({ ...formData, endHour: Number(e.target.value) })}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {formatTime(`${i.toString().padStart(2, '0')}:00`)}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="bulk-duration">Slot Duration</Label>
          <select
            id="bulk-duration"
            value={formData.durationMinutes}
            onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Include Breaks */}
        <div className="space-y-2">
          <Label>Breaks</Label>
          <div className="flex items-center gap-3 h-10">
            <button
              type="button"
              role="switch"
              aria-checked={formData.includeBreaks}
              onClick={() => setFormData({ ...formData, includeBreaks: !formData.includeBreaks })}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                formData.includeBreaks ? 'bg-primary' : 'bg-input'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
                  formData.includeBreaks ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
            <span className="text-sm text-muted-foreground">
              Add {formData.breakDuration} min breaks
            </span>
          </div>
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="space-y-2">
          <Label>Preview ({preview.length} slots)</Label>
          <div className="rounded-lg border bg-muted/30 p-3 max-h-48 overflow-y-auto">
            <div className="space-y-1.5">
              {preview.map((slot, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between text-sm px-2 py-1 rounded',
                    slot.isBreak ? 'bg-muted text-muted-foreground' : 'bg-background'
                  )}
                >
                  <span>
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </span>
                  {slot.isBreak && (
                    <Badge variant="secondary" className="text-xs">
                      Break
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Slots will be created for {selectedVenue?.name || 'selected venue'} on {formData.dayDate ? formatDate(formData.dayDate) : 'selected date'}
          </p>
        </div>
      )}

      {preview.length === 0 && formData.startHour >= formData.endHour && (
        <p className="text-sm text-destructive">End hour must be after start hour</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button onClick={handleGenerate} disabled={preview.length === 0}>
          <Zap className="h-4 w-4 mr-2" />
          Generate {preview.length} Slots
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ScheduleStep({ state, dispatch }: ScheduleStepProps) {
  const { schedule, venues, dates } = state;
  const [showForm, setShowForm] = React.useState(false);
  const [showBulkGenerator, setShowBulkGenerator] = React.useState(false);
  const [editingSlot, setEditingSlot] = React.useState<WizardTimeSlot | null>(null);

  // Get event dates array
  const eventDates = React.useMemo(() => {
    if (!dates.startDate || !dates.endDate) return [];
    return getEventDates(dates.startDate, dates.endDate);
  }, [dates.startDate, dates.endDate]);

  // Group time slots by date
  const slotsByDate = React.useMemo(() => {
    const grouped: Record<string, WizardTimeSlot[]> = {};

    for (const slot of schedule.timeSlots) {
      if (!grouped[slot.dayDate]) {
        grouped[slot.dayDate] = [];
      }
      grouped[slot.dayDate].push(slot);
    }

    // Sort slots within each day by start time
    for (const date of Object.keys(grouped)) {
      grouped[date].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    }

    return grouped;
  }, [schedule.timeSlots]);

  // Check if dates and venues are configured
  const hasDates = eventDates.length > 0;
  const hasVenues = venues.length > 0;
  const canAddSlots = hasDates && hasVenues;

  const handleAddSlot = () => {
    setEditingSlot(null);
    setShowForm(true);
    setShowBulkGenerator(false);
  };

  const handleEditSlot = (slot: WizardTimeSlot) => {
    setEditingSlot(slot);
    setShowForm(true);
    setShowBulkGenerator(false);
  };

  const handleDeleteSlot = (id: string) => {
    dispatch({ type: 'REMOVE_TIME_SLOT', payload: id });
  };

  const handleFormSubmit = (data: TimeSlotFormData) => {
    const slotData: WizardTimeSlot = {
      id: editingSlot?.id || generateId(),
      ...data,
    };

    if (editingSlot) {
      dispatch({
        type: 'UPDATE_TIME_SLOT',
        payload: { id: editingSlot.id, updates: slotData },
      });
    } else {
      dispatch({ type: 'ADD_TIME_SLOT', payload: slotData });
    }

    setShowForm(false);
    setEditingSlot(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingSlot(null);
  };

  const handleShowBulkGenerator = () => {
    setShowBulkGenerator(true);
    setShowForm(false);
    setEditingSlot(null);
  };

  const handleBulkGenerate = (slots: Omit<WizardTimeSlot, 'id'>[]) => {
    for (const slot of slots) {
      dispatch({
        type: 'ADD_TIME_SLOT',
        payload: { ...slot, id: generateId() },
      });
    }
    setShowBulkGenerator(false);
  };

  const handleBulkCancel = () => {
    setShowBulkGenerator(false);
  };

  const getVenueById = (id: string) => venues.find((v) => v.id === id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>
            Define time slots for sessions. Each slot represents a window where a session can be scheduled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prerequisites Check */}
          {!canAddSlots && (
            <div className="rounded-lg bg-muted/50 border p-4 text-sm text-muted-foreground space-y-2">
              {!hasDates && (
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Please set your event dates in the previous step first.
                </p>
              )}
              {!hasVenues && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Please add at least one venue before creating time slots.
                </p>
              )}
            </div>
          )}

          {/* Time Slots by Date */}
          {canAddSlots && Object.keys(slotsByDate).length > 0 && (
            <div className="space-y-4">
              {eventDates
                .filter((date) => slotsByDate[date]?.length > 0)
                .map((date) => (
                  <div key={date} className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(date)}
                      <Badge variant="secondary" className="text-xs">
                        {slotsByDate[date].length} slot{slotsByDate[date].length !== 1 ? 's' : ''}
                      </Badge>
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {slotsByDate[date].map((slot) => (
                        <TimeSlotCard
                          key={slot.id}
                          slot={slot}
                          venue={getVenueById(slot.venueId)}
                          onEdit={handleEditSlot}
                          onDelete={handleDeleteSlot}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Empty State */}
          {canAddSlots && schedule.timeSlots.length === 0 && !showForm && !showBulkGenerator && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                No time slots defined yet. Add slots individually or generate them in bulk.
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={handleAddSlot}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Slot
                </Button>
                <Button variant="outline" onClick={handleShowBulkGenerator}>
                  <Zap className="h-4 w-4 mr-2" />
                  Bulk Generate
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons (when slots exist) */}
          {canAddSlots && schedule.timeSlots.length > 0 && !showForm && !showBulkGenerator && (
            <div className="flex gap-3">
              <Button onClick={handleAddSlot} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Time Slot
              </Button>
              <Button variant="outline" onClick={handleShowBulkGenerator}>
                <Zap className="h-4 w-4 mr-2" />
                Bulk Generate
              </Button>
            </div>
          )}

          {/* Time Slot Form */}
          {showForm && canAddSlots && (
            <Card className="border-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {editingSlot ? 'Edit Time Slot' : 'New Time Slot'}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFormCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <TimeSlotForm
                  initialData={editingSlot}
                  venues={venues}
                  eventDates={eventDates}
                  existingSlots={schedule.timeSlots}
                  eventStartDate={dates.startDate}
                  eventEndDate={dates.endDate}
                  onSubmit={handleFormSubmit}
                  onCancel={handleFormCancel}
                  isEditing={!!editingSlot}
                />
              </CardContent>
            </Card>
          )}

          {/* Bulk Generator */}
          {showBulkGenerator && canAddSlots && (
            <Card className="border-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Bulk Generate Time Slots</CardTitle>
                    <CardDescription className="mt-1">
                      Quickly create multiple time slots for a day
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBulkCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <BulkGenerator
                  venues={venues}
                  eventDates={eventDates}
                  existingSlots={schedule.timeSlots}
                  onGenerate={handleBulkGenerate}
                  onCancel={handleBulkCancel}
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips for Scheduling</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Time Slots vs Sessions:</strong> Time slots define when sessions can happen. Actual sessions will be assigned to these slots later.
          </p>
          <p>
            <strong>Breaks:</strong> Mark lunch and coffee breaks so they appear differently in the schedule.
          </p>
          <p>
            <strong>Overlap:</strong> You can have parallel sessions in different venues at the same time, but not multiple slots in the same venue at the same time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ScheduleStep;
