-- Phase 4.2: Notification Triggers
-- P4.2.1: Session status change trigger
-- P4.2.2: Vote milestone trigger
-- P4.2.3: Co-host invite trigger

-- =============================================================================
-- P4.2.1: SESSION STATUS CHANGE TRIGGER
-- =============================================================================
-- Creates notifications when session status changes:
-- - pending -> approved: session_approved to host + cohosts
-- - pending -> rejected: session_rejected to host
-- - approved -> scheduled: session_scheduled to host + cohosts
-- - scheduled -> scheduled (with time/venue change): session_rescheduled

CREATE OR REPLACE FUNCTION notify_session_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_type VARCHAR(50);
  v_title TEXT;
  v_body TEXT;
  v_action_url TEXT;
  v_cohost RECORD;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN
    -- Check for reschedule (time_slot_id or venue_id changed while scheduled)
    IF NEW.status = 'scheduled' AND (
      OLD.time_slot_id IS DISTINCT FROM NEW.time_slot_id OR
      OLD.venue_id IS DISTINCT FROM NEW.venue_id
    ) THEN
      v_notification_type := 'session_rescheduled';
      v_title := 'Your session has been rescheduled';
      v_body := format('"%s" has been moved to a new time or venue.', NEW.title);
    ELSE
      RETURN NEW; -- No relevant change
    END IF;
  ELSE
    -- Status changed
    CASE
      WHEN OLD.status = 'pending' AND NEW.status = 'approved' THEN
        v_notification_type := 'session_approved';
        v_title := 'Your session has been approved!';
        v_body := format('"%s" has been approved and is now visible to attendees.', NEW.title);

      WHEN OLD.status = 'pending' AND NEW.status = 'rejected' THEN
        v_notification_type := 'session_rejected';
        v_title := 'Session not approved';
        v_body := format('"%s" was not selected for this event.', NEW.title);

      WHEN NEW.status = 'scheduled' AND OLD.status != 'scheduled' THEN
        v_notification_type := 'session_scheduled';
        v_title := 'Your session has been scheduled!';
        v_body := format('"%s" has been added to the official schedule.', NEW.title);

      ELSE
        RETURN NEW; -- Other status changes don't generate notifications
    END CASE;
  END IF;

  -- Build action URL
  v_action_url := '/e/' || (
    SELECT slug FROM events WHERE id = NEW.event_id
  ) || '/sessions/' || NEW.id;

  -- Create notification for host
  INSERT INTO notifications (user_id, event_id, type, title, body, action_url, data)
  VALUES (
    NEW.host_id,
    NEW.event_id,
    v_notification_type,
    v_title,
    v_body,
    v_action_url,
    jsonb_build_object('session_id', NEW.id, 'session_title', NEW.title)
  );

  -- Create notifications for co-hosts (except for rejection)
  IF v_notification_type != 'session_rejected' THEN
    FOR v_cohost IN
      SELECT user_id FROM session_cohosts WHERE session_id = NEW.id
    LOOP
      INSERT INTO notifications (user_id, event_id, type, title, body, action_url, data)
      VALUES (
        v_cohost.user_id,
        NEW.event_id,
        v_notification_type,
        v_title,
        v_body,
        v_action_url,
        jsonb_build_object('session_id', NEW.id, 'session_title', NEW.title, 'is_cohost', true)
      );
    END LOOP;
  END IF;

  -- Notify admins of new proposals (when session is first created as pending)
  -- This is handled separately in the INSERT trigger below

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on session UPDATE
DROP TRIGGER IF EXISTS trigger_session_status_change ON sessions;
CREATE TRIGGER trigger_session_status_change
  AFTER UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_session_status_change();

-- =============================================================================
-- NEW PROPOSAL NOTIFICATION (for admins)
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_new_proposal()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
  v_event_slug TEXT;
  v_action_url TEXT;
BEGIN
  -- Only for new proposals (status = pending)
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get event slug
  SELECT slug INTO v_event_slug FROM events WHERE id = NEW.event_id;
  v_action_url := '/e/' || v_event_slug || '/admin/proposals';

  -- Notify all admins and owners of this event
  FOR v_admin IN
    SELECT user_id FROM event_members
    WHERE event_id = NEW.event_id
      AND role IN ('owner', 'admin')
      AND user_id != NEW.host_id  -- Don't notify the proposer if they're an admin
  LOOP
    INSERT INTO notifications (user_id, event_id, type, title, body, action_url, data)
    VALUES (
      v_admin.user_id,
      NEW.event_id,
      'new_proposal',
      'New session proposal',
      format('"%s" by %s needs review.', NEW.title, COALESCE(NEW.host_name, 'Unknown')),
      v_action_url,
      jsonb_build_object('session_id', NEW.id, 'session_title', NEW.title, 'host_name', NEW.host_name)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on session INSERT
DROP TRIGGER IF EXISTS trigger_new_proposal ON sessions;
CREATE TRIGGER trigger_new_proposal
  AFTER INSERT ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_proposal();

-- =============================================================================
-- P4.2.2: VOTE MILESTONE TRIGGER
-- =============================================================================
-- Notifies session host when they reach vote milestones: 10, 25, 50, 100

CREATE OR REPLACE FUNCTION notify_vote_milestone()
RETURNS TRIGGER AS $$
DECLARE
  v_old_votes INTEGER;
  v_new_votes INTEGER;
  v_milestone INTEGER;
  v_event_slug TEXT;
  v_action_url TEXT;
  v_session RECORD;
BEGIN
  -- Get old and new vote counts
  v_old_votes := COALESCE(OLD.total_votes, 0);
  v_new_votes := COALESCE(NEW.total_votes, 0);

  -- Only check if votes increased
  IF v_new_votes <= v_old_votes THEN
    RETURN NEW;
  END IF;

  -- Check each milestone
  FOREACH v_milestone IN ARRAY ARRAY[10, 25, 50, 100]
  LOOP
    -- If we crossed this milestone
    IF v_old_votes < v_milestone AND v_new_votes >= v_milestone THEN
      -- Get session info
      SELECT s.*, e.slug as event_slug
      INTO v_session
      FROM sessions s
      JOIN events e ON e.id = s.event_id
      WHERE s.id = NEW.id;

      v_action_url := '/e/' || v_session.event_slug || '/sessions/' || NEW.id;

      -- Notify host
      INSERT INTO notifications (user_id, event_id, type, title, body, action_url, data)
      VALUES (
        NEW.host_id,
        NEW.event_id,
        'vote_milestone',
        format('Your session reached %s votes!', v_milestone),
        format('"%s" is gaining traction with %s total votes.', NEW.title, v_new_votes),
        v_action_url,
        jsonb_build_object('session_id', NEW.id, 'milestone', v_milestone, 'total_votes', v_new_votes)
      );

      -- Only notify for the highest milestone crossed
      EXIT;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on session vote count update
DROP TRIGGER IF EXISTS trigger_vote_milestone ON sessions;
CREATE TRIGGER trigger_vote_milestone
  AFTER UPDATE OF total_votes ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_vote_milestone();

-- =============================================================================
-- P4.2.3: CO-HOST INVITE TRIGGER
-- =============================================================================
-- Notifies when:
-- - User is invited to co-host (cohost_invited)
-- - User accepts invitation (cohost_accepted -> notify original host)
-- - User declines/invite expires (cohost_declined -> notify original host)

CREATE OR REPLACE FUNCTION notify_cohost_invite_created()
RETURNS TRIGGER AS $$
DECLARE
  v_session RECORD;
  v_event_slug TEXT;
  v_action_url TEXT;
  v_invitee_id UUID;
BEGIN
  -- Get session and event info
  SELECT s.*, e.slug as event_slug
  INTO v_session
  FROM sessions s
  JOIN events e ON e.id = s.event_id
  WHERE s.id = NEW.session_id;

  -- Try to find the user by email
  SELECT id INTO v_invitee_id
  FROM profiles
  WHERE email = NEW.email;

  -- Only notify if user exists in the system
  IF v_invitee_id IS NOT NULL THEN
    v_action_url := '/invite/' || NEW.token;

    INSERT INTO notifications (user_id, event_id, type, title, body, action_url, data)
    VALUES (
      v_invitee_id,
      v_session.event_id,
      'cohost_invited',
      'You''ve been invited to co-host a session',
      format('%s invited you to co-host "%s"', COALESCE(v_session.host_name, 'Someone'), v_session.title),
      v_action_url,
      jsonb_build_object(
        'session_id', NEW.session_id,
        'session_title', v_session.title,
        'invite_token', NEW.token
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on cohost_invites INSERT
DROP TRIGGER IF EXISTS trigger_cohost_invite_created ON cohost_invites;
CREATE TRIGGER trigger_cohost_invite_created
  AFTER INSERT ON cohost_invites
  FOR EACH ROW
  EXECUTE FUNCTION notify_cohost_invite_created();

-- Notify host when co-host accepts or declines
CREATE OR REPLACE FUNCTION notify_cohost_response()
RETURNS TRIGGER AS $$
DECLARE
  v_session RECORD;
  v_event_slug TEXT;
  v_action_url TEXT;
  v_notification_type VARCHAR(50);
  v_title TEXT;
  v_body TEXT;
  v_responder_name TEXT;
BEGIN
  -- Only fire on status change from 'pending'
  IF OLD.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get session and event info
  SELECT s.*, e.slug as event_slug
  INTO v_session
  FROM sessions s
  JOIN events e ON e.id = s.event_id
  WHERE s.id = NEW.session_id;

  -- Get responder name
  SELECT COALESCE(display_name, email) INTO v_responder_name
  FROM profiles
  WHERE email = NEW.email;

  v_action_url := '/e/' || v_session.event_slug || '/sessions/' || NEW.session_id;

  IF NEW.status = 'accepted' THEN
    v_notification_type := 'cohost_accepted';
    v_title := 'Co-host invitation accepted';
    v_body := format('%s accepted your invitation to co-host "%s"', COALESCE(v_responder_name, NEW.email), v_session.title);
  ELSIF NEW.status IN ('expired', 'revoked') THEN
    -- Don't notify for expired/revoked
    RETURN NEW;
  ELSE
    -- Declined (if we add that status later)
    v_notification_type := 'cohost_declined';
    v_title := 'Co-host invitation declined';
    v_body := format('%s declined your invitation to co-host "%s"', COALESCE(v_responder_name, NEW.email), v_session.title);
  END IF;

  -- Notify the session host
  INSERT INTO notifications (user_id, event_id, type, title, body, action_url, data)
  VALUES (
    v_session.host_id,
    v_session.event_id,
    v_notification_type,
    v_title,
    v_body,
    v_action_url,
    jsonb_build_object(
      'session_id', NEW.session_id,
      'session_title', v_session.title,
      'cohost_email', NEW.email,
      'cohost_name', v_responder_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on cohost_invites UPDATE
DROP TRIGGER IF EXISTS trigger_cohost_response ON cohost_invites;
CREATE TRIGGER trigger_cohost_response
  AFTER UPDATE ON cohost_invites
  FOR EACH ROW
  EXECUTE FUNCTION notify_cohost_response();
