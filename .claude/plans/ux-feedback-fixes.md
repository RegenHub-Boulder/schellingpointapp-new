# UX Feedback Fixes Plan

## Overview
Addressing colleague feedback on usability issues across the app.

---

## Priority 1: Critical Auth/Login Issues

### 1.1 Magic Link Flow Improvements
**Files:** `/src/app/login/page.tsx`
- Add "No account? We'll create one for you" text below sign in
- Fix loading state (infinity spiral issue) - show clear "Sending..." then "Check your email!"
- Fix false "failed to send" error when it actually succeeded
- After sending, show success state with instructions to check email
- Add "Back to sign in" or clear navigation after logout

### 1.2 Logout Flow
**Files:** `/src/components/DashboardLayout.tsx` or relevant logout handler
- Add confirmation or acknowledgment when logging out
- Redirect to login page with "You've been logged out" message
- Ensure clear path to log back in

### 1.3 Email Template Fixes
**Files:** `/supabase/templates/` or Supabase dashboard
- Center the logo
- Make button text darker for better contrast
- Fix "white text on confirm email address button" contrast issue

---

## Priority 2: Voting/Favoriting Clarity

### 2.1 Voting Explainer Text
**Files:** `/src/components/SessionCard.tsx`, `/src/app/sessions/[id]/page.tsx`
- Add small subtext: "Votes save automatically" or "No submit needed - votes are instant"
- Add below voting controls on session detail page
- Add tooltip or helper text on session cards

### 2.2 Heart/Favorite Clarity
**Files:** `/src/components/SessionCard.tsx`
- Consider adding small label "Save" next to heart on hover
- Or change to bookmark icon which is more universally "save"
- Ensure "Add to My Schedule" button text is visible/clear

---

## Priority 3: Form Errors & Validation

### 3.1 Propose Session Error Positioning
**Files:** `/src/app/propose/page.tsx`
- Move error messages to bottom of form (near submit button)
- Or add scroll-to-error behavior
- Make errors more visible with animation

### 3.2 Self-Hosted Location Validation
**Files:** `/src/app/propose/page.tsx`
- If "self-hosted" is selected, require `custom_location` field
- Add validation message: "Please provide location details for self-hosted sessions"

---

## Priority 4: Profile & Modal Fixes

### 4.1 Profile Setup Tag Consistency
**Files:** `/src/app/profile/setup/page.tsx` or profile components
- Make selected/active tags same size and shape as inactive tags
- Only differentiate by color/border, not size

### 4.2 Admin Badge Wrap
**Files:** Profile modal/popover component
- Ensure admin badge wraps and doesn't block X close button
- Add proper spacing/layout

### 4.3 Profile Modal Close Button
**Files:** Host profile popover in `/src/app/sessions/[id]/page.tsx`
- Ensure X close button is always visible and accessible
- Already has mobile close button, check desktop

---

## Priority 5: External Links & Social

### 5.1 Telegram Link Fix
**Files:** Profile display components
- Check Telegram username formatting
- Ensure `https://t.me/username` format is correct
- Handle usernames with/without @ symbol

### 5.2 YouTube Link Fix
**Files:** Profile components
- Check YouTube URL formatting
- Ensure proper URL construction

### 5.3 Social Share Image
**Status:** Already implemented (commit f903595)
- Verify it's working correctly

### 5.4 Feedback Path
**Future feature** - Add feedback link/button somewhere in UI

---

## Priority 6: Schedule Page Polish

### 6.1 Tag Bounds on Schedule
**Files:** `/src/app/schedule/page.tsx`, `/src/app/my-schedule/page.tsx`
- Trim/fix tag bounds/styling
- Match container styling for "By Time" and "By Venue" between pages

### 6.2 Venue View Display
**Files:** `/src/app/schedule/page.tsx`
- Verify venue grouping displays correctly
- Test with actual venue data

### 6.3 Day Selection Logic
**Files:** `/src/app/schedule/page.tsx`
- Consider defaulting to current day if event is ongoing
- Or default to first day with sessions

---

## Priority 7: Dashboard Fixes

### 7.1 Pending Proposals Tag Wrap
**Files:** `/src/app/dashboard/page.tsx`
- Fix tag wrapping in pending proposals section
- Ensure long tags don't break layout

---

## Priority 8: Color Consistency

### 8.1 Vote Stats Green Color
**Files:** Various components showing vote stats
- Audit green colors used for credits/votes
- Ensure consistent shade across app

---

## Future Considerations (Not Immediate)

### Onboarding Flow
- 3-4 screen swipe intro/guide
- Explain voting system, credits, scheduling
- Could be modal or dedicated onboarding route

### Admin Communication
- Way for proposers to communicate with reviewers
- Could be comments or messaging system

---

## Implementation Order

1. **Auth fixes** (1.1, 1.2, 1.3) - Critical for first-time users
2. **Voting explainer** (2.1) - Reduces confusion
3. **Error positioning** (3.1) - Improves form UX
4. **Profile/modal fixes** (4.1-4.3) - Polish
5. **External links** (5.1, 5.2) - Bug fixes
6. **Schedule polish** (6.1-6.3) - Consistency
7. **Dashboard fixes** (7.1) - Minor polish
8. **Color audit** (8.1) - Visual consistency

---

## Verification Checklist

- [ ] Can sign in with clear messaging about account creation
- [ ] Magic link shows loading → success → "check email" flow
- [ ] Logout shows confirmation and path to log back in
- [ ] Email template has centered logo, readable button text
- [ ] Voting has "saves automatically" explainer
- [ ] Heart/save action is clear
- [ ] Propose errors show near submit button
- [ ] Self-hosted requires location details
- [ ] Profile tags are consistent size
- [ ] Admin badge doesn't block close button
- [ ] Telegram/YouTube links work
- [ ] Schedule page tags are trimmed
- [ ] My Schedule matches Schedule styling
- [ ] Pending proposals tags wrap correctly
- [ ] Green colors are consistent
