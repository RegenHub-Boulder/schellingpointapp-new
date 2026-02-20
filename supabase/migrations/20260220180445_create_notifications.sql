-- Phase 4.1: Notifications Database Schema
-- P4.1.1: Create notifications table
-- P4.1.2: Create notification_preferences table

-- =============================================================================
-- NOTIFICATION TYPES
-- =============================================================================
-- Session lifecycle:
--   session_submitted      - Proposer: Your session was submitted
--   session_approved       - Host: Your session was approved
--   session_rejected       - Host: Your session was rejected
--   session_scheduled      - Host: Your session has been scheduled
--   session_rescheduled    - Host: Your session time/venue changed
--   session_cancelled      - Host: Your session was cancelled
--
-- Voting:
--   vote_milestone         - Host: Your session reached X votes
--
-- Collaboration:
--   cohost_invited         - User: You were invited to co-host
--   cohost_accepted        - Host: Co-host accepted your invitation
--   cohost_declined        - Host: Co-host declined your invitation
--
-- Event-wide:
--   voting_opened          - All: Voting is now open
--   voting_closed          - All: Voting has closed
--   schedule_published     - All: The schedule is live
--   event_reminder         - All: Event starts tomorrow/in 1 hour
--   admin_announcement     - All: Custom message from organizers
--
-- Admin:
--   new_proposal           - Admins: New session proposal submitted
--   proposal_needs_review  - Admins: Proposals waiting for review

-- =============================================================================
-- P4.1.1: NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who this notification is for
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Which event (NULL for platform-wide notifications)
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Notification type (see list above)
  type VARCHAR(50) NOT NULL,

  -- Display content
  title TEXT NOT NULL,
  body TEXT,

  -- Additional data for the notification (e.g., session_id, reason)
  data JSONB DEFAULT '{}',

  -- Link to navigate to when clicked (relative path)
  action_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,        -- NULL = unread
  email_sent_at TIMESTAMPTZ,  -- NULL = email not sent yet (or not applicable)
  push_sent_at TIMESTAMPTZ,   -- NULL = push not sent yet (or not applicable)

  -- Constraints
  CONSTRAINT valid_notification_type CHECK (
    type IN (
      -- Session lifecycle
      'session_submitted',
      'session_approved',
      'session_rejected',
      'session_scheduled',
      'session_rescheduled',
      'session_cancelled',
      -- Voting
      'vote_milestone',
      -- Collaboration
      'cohost_invited',
      'cohost_accepted',
      'cohost_declined',
      -- Event-wide
      'voting_opened',
      'voting_closed',
      'schedule_published',
      'event_reminder',
      'admin_announcement',
      -- Admin
      'new_proposal',
      'proposal_needs_review'
    )
  )
);

-- Index for fetching user's unread notifications (most common query)
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

-- Index for fetching all user notifications (paginated)
CREATE INDEX idx_notifications_user_all
  ON notifications(user_id, created_at DESC);

-- Index for event-scoped notifications
CREATE INDEX idx_notifications_event
  ON notifications(event_id, created_at DESC)
  WHERE event_id IS NOT NULL;

-- Index for finding unsent emails (for dispatch worker)
CREATE INDEX idx_notifications_pending_email
  ON notifications(created_at)
  WHERE email_sent_at IS NULL;

-- =============================================================================
-- P4.1.2: NOTIFICATION PREFERENCES TABLE
-- =============================================================================

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who these preferences belong to
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event-specific preferences (NULL = global defaults)
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Category of notifications
  -- Using categories instead of individual types for simpler UX
  category VARCHAR(50) NOT NULL,

  -- Channel toggles
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT false,  -- Off by default, opt-in

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only have one preference per category per event
  UNIQUE(user_id, event_id, category),

  -- Valid categories
  CONSTRAINT valid_preference_category CHECK (
    category IN (
      'session_updates',      -- session_submitted, approved, rejected, scheduled, rescheduled
      'voting_updates',       -- vote_milestone
      'collaboration',        -- cohost_invited, accepted, declined
      'event_announcements',  -- voting_opened, voting_closed, schedule_published, event_reminder, admin_announcement
      'admin_alerts'          -- new_proposal, proposal_needs_review (only for admins)
    )
  )
);

-- Index for looking up user preferences
CREATE INDEX idx_notification_preferences_user
  ON notification_preferences(user_id);

-- Index for event-specific preferences
CREATE INDEX idx_notification_preferences_event
  ON notification_preferences(user_id, event_id)
  WHERE event_id IS NOT NULL;

-- =============================================================================
-- HELPER FUNCTION: Map notification type to category
-- =============================================================================

CREATE OR REPLACE FUNCTION get_notification_category(notification_type VARCHAR(50))
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN CASE notification_type
    -- Session lifecycle
    WHEN 'session_submitted' THEN 'session_updates'
    WHEN 'session_approved' THEN 'session_updates'
    WHEN 'session_rejected' THEN 'session_updates'
    WHEN 'session_scheduled' THEN 'session_updates'
    WHEN 'session_rescheduled' THEN 'session_updates'
    WHEN 'session_cancelled' THEN 'session_updates'
    -- Voting
    WHEN 'vote_milestone' THEN 'voting_updates'
    -- Collaboration
    WHEN 'cohost_invited' THEN 'collaboration'
    WHEN 'cohost_accepted' THEN 'collaboration'
    WHEN 'cohost_declined' THEN 'collaboration'
    -- Event-wide
    WHEN 'voting_opened' THEN 'event_announcements'
    WHEN 'voting_closed' THEN 'event_announcements'
    WHEN 'schedule_published' THEN 'event_announcements'
    WHEN 'event_reminder' THEN 'event_announcements'
    WHEN 'admin_announcement' THEN 'event_announcements'
    -- Admin
    WHEN 'new_proposal' THEN 'admin_alerts'
    WHEN 'proposal_needs_review' THEN 'admin_alerts'
    ELSE 'session_updates'  -- Default fallback
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- HELPER FUNCTION: Check if user wants notification via channel
-- =============================================================================

CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_event_id UUID,
  p_type VARCHAR(50),
  p_channel VARCHAR(20)  -- 'email', 'in_app', 'push'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_category VARCHAR(50);
  v_pref notification_preferences%ROWTYPE;
BEGIN
  -- Get the category for this notification type
  v_category := get_notification_category(p_type);

  -- Look for event-specific preference first
  SELECT * INTO v_pref
  FROM notification_preferences
  WHERE user_id = p_user_id
    AND event_id = p_event_id
    AND category = v_category;

  -- If no event-specific preference, check global preference
  IF NOT FOUND THEN
    SELECT * INTO v_pref
    FROM notification_preferences
    WHERE user_id = p_user_id
      AND event_id IS NULL
      AND category = v_category;
  END IF;

  -- If still no preference found, use defaults (email=true, in_app=true, push=false)
  IF NOT FOUND THEN
    RETURN CASE p_channel
      WHEN 'email' THEN true
      WHEN 'in_app' THEN true
      WHEN 'push' THEN false
      ELSE false
    END;
  END IF;

  -- Return the appropriate channel setting
  RETURN CASE p_channel
    WHEN 'email' THEN v_pref.email_enabled
    WHEN 'in_app' THEN v_pref.in_app_enabled
    WHEN 'push' THEN v_pref.push_enabled
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only system can insert notifications (via triggers or admin client)
-- No INSERT policy for regular users

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own preferences"
  ON notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- UPDATED_AT TRIGGER for notification_preferences
-- =============================================================================

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();
