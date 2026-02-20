-- Add schedule_published_at to events table for draft/publish workflow
ALTER TABLE events ADD COLUMN IF NOT EXISTS schedule_published_at TIMESTAMPTZ;

-- Add last_schedule_change_at to track when schedule was last modified
ALTER TABLE events ADD COLUMN IF NOT EXISTS last_schedule_change_at TIMESTAMPTZ;

-- Create a function to update last_schedule_change_at when sessions are scheduled/unscheduled
CREATE OR REPLACE FUNCTION update_event_schedule_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When a session's time_slot_id or venue_id changes, update the event's last_schedule_change_at
  IF (TG_OP = 'UPDATE' AND (
    OLD.time_slot_id IS DISTINCT FROM NEW.time_slot_id OR
    OLD.venue_id IS DISTINCT FROM NEW.venue_id OR
    OLD.status IS DISTINCT FROM NEW.status
  )) OR TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    UPDATE events
    SET last_schedule_change_at = NOW()
    WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on sessions table
DROP TRIGGER IF EXISTS trigger_update_event_schedule_change ON sessions;
CREATE TRIGGER trigger_update_event_schedule_change
  AFTER INSERT OR UPDATE OR DELETE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_event_schedule_change();

-- Add index for quick lookup
CREATE INDEX IF NOT EXISTS idx_events_schedule_published ON events(schedule_published_at) WHERE schedule_published_at IS NOT NULL;
