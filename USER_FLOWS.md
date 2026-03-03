# E-Voting Platform - UX & User Flow Diagrams

## Complete User Journeys

---

## 1. PUBLIC USER JOURNEY (Anonymous Visitor)

```
Landing Page
  ├─ Read about platform
  ├─ View security features
  ├─ See how it works
  └─ Browse transparency metrics
      │
      ├─ Click "Sign In" → Login Page
      ├─ Click "Verify Vote" → Verification Page
      │   ├─ Enter receipt hash
      │   ├─ View vote confirmation
      │   └─ No vote content shown (Privacy)
      └─ Click "View Transparency" → System Status Page
          ├─ View system uptime
          ├─ See infrastructure health
          ├─ Check incident history
          └─ Review audit summary
```

---

## 2. VOTER JOURNEY (Complete Voting Process)

```
Login Page
  ├─ Email + Password
  ├─ WebAuthn authentication
  └─ 2FA verification
      │
      ↓
Voter Dashboard
  ├─ View active elections (3 states)
  │   ├─ OPEN elections → Clickable, green "Vote Now" button
  │   ├─ CLOSED elections → Grayed out, shows vote timestamp
  │   └─ UPCOMING elections → Grayed out, shows start date
  │
  ├─ Click "Vote Now" on open election
  │   │
  │   ↓ VOTING MODAL Opens
  │   ├─ STATE 1: "Select Your Choice"
  │   │   ├─ Display 5 candidates
  │   │   ├─ Show name, party, biography
  │   │   ├─ Clickable candidate buttons
  │   │   └─ "Continue" button activates when selected
  │   │
  │   ├─ Click"Continue"
  │   │   │
  │   │   ↓ STATE 2: "Confirm Your Vote"
  │   │   ├─ Show election name
  │   │   ├─ Show selected candidate
  │   │   ├─ Display security banner: "Your ballot will be encrypted"
  │   │   ├─ "Back" button (return to select)
  │   │   └─ "Confirm & Encrypt" button
  │   │
  │   ├─ Click "Confirm & Encrypt"
  │   │   │
  │   │   ↓ STATE 3: "Encrypting Your Ballot"
  │   │   ├─ Progress bar (0-100%)
  │   │   ├─ Shows "AES-256 end-to-end encryption"
  │   │   ├─ No user action available
  │   │   └─ Auto-advances on completion
  │   │
  │   └─ Encryption Complete
  │       │
  │       ↓ STATE 4: "Vote Submitted Successfully"
  │       ├─ Green success banner
  │       ├─ Display receipt hash (monospace)
  │       ├─ "Copy to clipboard" button
  │       ├─ Info: "Use this hash to verify your vote"
  │       ├─ Link to: evote.gov/verify
  │       └─ "Done" button closes modal
  │
  ├─ Modal closes
  │   │
  │   ↓ Dashboard updates
  │   ├─ Election card now shows: "✓ Voted on [TIME]"
  │   ├─ Vote button disabled
  │   └─ Status changed to voted
  │
  └─ User can:
      ├─ Verify vote using receipt hash
      ├─ Review other elections
      ├─ Logout
      └─ View security information
```

---

## 3. VERIFICATION JOURNEY

```
Verification Page
  │
  ├─ User enters receipt hash (copy/paste)
  │   │
  │   ↓ Server lookup
  │   ├─ Hash found (70% probability in demos)
  │   │   │
  │   │   ↓ SUCCESS STATE
  │   │   ├─ Green success banner
  │   │   ├─ "Vote Confirmed" title
  │   │   ├─ Election name
  │   │   ├─ Timestamp of vote
  │   │   ├─ Status badge (Confirmed)
  │   │   ├─ Note: "Vote content not displayed for privacy"
  │   │   └─ Verify another? (form clears, stays on page)
  │   │
  │   └─ Hash NOT found (30% probability)
  │       │
  │       ↓ ERROR STATE
  │       ├─ Red error banner
  │       ├─ "No Match Found" title
  │       ├─ "Check that you copied it correctly"
  │       └─ Try again
  │
  ├─ User can:
  │   ├─ Verify another vote (form resets)
  │   ├─ Go back to landing
  │   └─ View FAQ (inline on page)
  │
  └─ FAQ Section Shows:
      ├─ Q: Is my vote hash secure?
      ├─ Q: What if my vote is not found?
      ├─ Q: Can I change my vote?
      └─ Q: Is my identity exposed?
```

---

## 4. SYSTEM STATUS JOURNEY

```
System Status Page
  │
  ├─ OVERALL STATUS INDICATOR
  │   ├─ Green badge: "All Systems Operational"
  │   └─ Real-time health
  │
  ├─ KEY METRICS (4 cards)
  │   ├─ Uptime: 99.98% (Last 30 days)
  │   ├─ Active Connections: 12,847
  │   ├─ Requests/Second: 2,341
  │   └─ Database Latency: 12ms
  │
  ├─ INFRASTRUCTURE LOCATIONS (3 regions)
  │   ├─ US-East-1 Primary
  │   │   ├─ Status: Operational (green dot)
  │   │   ├─ CPU: 34%
  │   │   └─ Memory: 42%
  │   ├─ US-West-1 Secondary
  │   │   ├─ Status: Operational
  │   │   ├─ CPU: 28%
  │   │   └─ Memory: 38%
  │   └─ EU-Central-1 Tertiary
  │       ├─ Status: Operational
  │       ├─ CPU: 31%
  │       └─ Memory: 40%
  │
  ├─ SECURITY INDICATORS (4 checks)
  │   ├─ ✓ Encryption Active (checked 1m ago)
  │   ├─ ✓ Audit Logs (checked 2m ago)
  │   ├─ ✓ Backup Systems (checked 3m ago)
  │   └─ ✓ Intrusion Detection (checked 5m ago)
  │
  ├─ INCIDENT HISTORY (Last 3 months)
  │   ├─ 3 days ago: Scheduled Maintenance ✓ Complete
  │   └─ 10 days ago: Security Audit ✓ No issues found
  │
  ├─ MAINTENANCE SCHEDULE
  │   └─ No maintenance windows scheduled
  │
  └─ User gets:
      ├─ Complete transparency
      ├─ Real-time infrastructure view
      ├─ Security assurance
      └─ Historical context
```

---

## 5. ADMIN JOURNEY (Dashboard Navigation)

```
Admin Dashboard (/admin)
  │
  ├─ SIDEBAR MENU (Always visible)
  │   ├─ Overview (default view)
  │   ├─ Create Election
  │   ├─ Manage Elections
  │   ├─ Candidates
  │   ├─ Voter Management
  │   ├─ Audit Logs
  │   ├─ Results
  │   └─ System Status
  │
  └─ TOP BAR
      ├─ Admin Dashboard title
      ├─ User profile dropdown (admin@election.local)
      └─ Theme toggle
```

### **5A. Admin Overview Page**

```
Admin Overview
  │
  ├─ PAGE TITLE: "Admin Dashboard"
  │
  ├─ KEY METRICS (4 cards)
  │   ├─ Active Elections: 1
  │   ├─ Total Registered Voters: 2.9M
  │   ├─ Total Votes Cast: 1.9M
  │   └─ Average Turnout: 65.1%
  │
  ├─ SYSTEM MONITORING
  │   ├─ System Health card
  │   │   ├─ CPU Usage: 34% (graph)
  │   │   ├─ Memory: 42% (graph)
  │   │   ├─ Active Connections: 12,847
  │   │   ├─ Database: Healthy (green)
  │   │   ├─ Encryption: Active (green)
  │   │   └─ Last Audit: 30 minutes ago
  │
  ├─ SECURITY ALERTS
  │   ├─ Green banner: "All Systems Nominal"
  │   ├─ No vulnerabilities
  │   └─ Last penetration test: 7 days ago
  │
  ├─ ELECTION MANAGEMENT
  │   ├─ "+ Create New Election" button
  │   │   │
  │   │   ↓ Opens modal
  │   │   ├─ Modal Title: "Create New Election"
  │   │   ├─ Form Fields:
  │   │   │   ├─ Election Title
  │   │   │   ├─ Start Date & Time
  │   │   │   ├─ End Date & Time
  │   │   │   └─ Expected Voters
  │   │   ├─ Buttons: Cancel | Create Election
  │   │   └─ Modal closes on success
  │   │
  │   └─ ELECTIONS GRID (3 cards visible)
  │       ├─ Card 1: Presidential 2026
  │       │   ├─ Status: ACTIVE (green badge)
  │       │   ├─ Timing: [dates]
  │       │   ├─ Registered: 2,500,000
  │       │   ├─ Votes Cast: 1,850,000
  │       │   ├─ Turnout: 74.0% (graph)
  │       │   └─ Buttons: [Edit] [Close]
  │       │
  │       ├─ Card 2: Board of Directors
  │       │   ├─ Status: CLOSED (gray)
  │       │   ├─ Turnout: 85.8%
  │       │   └─ Buttons: [Edit] [Delete]
  │       │
  │       └─ Card 3: Local Council
  │           ├─ Status: SCHEDULED (blue)
  │           ├─ Starts in 30 days
  │           └─ Buttons: [Edit] [Start]
  │
  └─ Admin can quickly:
      ├─ Monitor active elections
      ├─ Create new elections
      ├─ Modify elections
      ├─ Review system health
      └─ Navigate to detailed views
```

### **5B. Admin Create Election Page**

```
Create New Election
  │
  ├─ PAGE TITLE: "Create New Election"
  ├─ SECTION TITLE: "Election Details"
  │
  ├─ FORM (max-width 500px)
  │   ├─ Field 1: "Election Title" (required)
  │   │   ├─ Placeholder: "e.g., Board of Directors 2026"
  │   │   └─ Error display (if validation fails)
  │   │
  │   ├─ Field 2: "Description" (optional)
  │   │   ├─ Textarea
  │   │   └─ Placeholder: "Optional description..."
  │   │
  │   ├─ Field 3: "Start Date & Time" (required)
  │   │   └─ datetime-local input
  │   │
  │   ├─ Field 4: "End Date & Time" (required)
  │   │   └─ datetime-local input
  │   │
  │   ├─ Field 5: "Expected Voters" (required)
  │   │   └─ Number input
  │   │
  │   └─ BUTTONS
  │       ├─ [Cancel] - goes back to overview
  │       └─ [Create Election] - submits form
  │
  └─ Success:
      ├─ Election created
      ├─ Redirect to overview
      ├─ New election appears in grid (DRAFT status)
      └─ Admin can now edit, add candidates, start election
```

### **5C. Admin Manage Elections Page**

```
Manage Elections
  │
  ├─ PAGE TITLE: "Manage Elections"
  ├─ SECTION TITLE: "All Elections"
  │
  └─ ELECTIONS GRID (all elections)
      ├─ For each election card:
      │   ├─ Title + Status badge
      │   ├─ Timing info
      │   ├─ Voter stats + Turnout %
      │   │
      │   └─ ACTION BUTTONS (context-sensitive)
      │       ├─ [Edit] - Always available
      │       ├─ [Start] - Only in DRAFT status
      │       ├─ [Close] - Only in ACTIVE status
      │       └─ [Delete] - Only in DRAFT status
      │
      └─ Workflows:
          ├─ Start election: Draft → Active
          ├─ Close election: Active → Closed
          ├─ Edit election: Update details (not after started)
          └─ Delete election: Remove draft elections
```

### **5D. Admin Audit Logs Page**

```
Audit Logs
  │
  ├─ PAGE TITLE: "Audit Logs"
  ├─ SECTION TITLE: "System Audit Events"
  │
  └─ AUDIT LOG LIST
      ├─ Entry 1: LOGIN
      │   ├─ Timestamp: [datetime]
      │   ├─ Event: LOGIN
      │   ├─ Actor: admin@election.local
      │   ├─ Role: admin
      │   └─ Color: Blue indicator
      │
      ├─ Entry 2: VOTE_CAST
      │   ├─ Timestamp: [datetime]
      │   ├─ Event: VOTE_CAST (anonymized)
      │   ├─ Actor: [system] (not voter identity)
      │   ├─ Role: voter (implied)
      │   └─ Color: Green indicator
      │
      ├─ Entry 3: ELECTION_START
      │   ├─ Timestamp: [datetime]
      │   ├─ Event: ELECTION_START
      │   ├─ Actor: admin@election.local
      │   ├─ Role: admin
      │   └─ Color: Gold indicator
      │
      └─ Entry 4: KEY_ROTATION
          ├─ Timestamp: [datetime]
          ├─ Event: KEY_ROTATION
          ├─ Actor: [system]
          ├─ Role: system
          └─ Color: Green indicator
      
      Features:
      ├─ ✓ Chronological order (newest first)
      ├─ ✓ Color-coded by event type
      ├─ ✓ No sensitive voter data exposed
      ├─ ✓ All system actions logged
      ├─ Future: Filter by date range, actor, event type
      └─ Future: Export as CSV/PDF
```

### **5E. Admin System Status Page**

```
System Status (Admin View)
  │
  ├─ PAGE TITLE: "System Status"
  ├─ SECTION TITLE: "Infrastructure Health"
  │
  └─ Same as public System Status page:
      ├─ Key metrics
      ├─ Infrastructure locations
      ├─ Security indicators
      ├─ Incident history
      └─ Maintenance schedule
      
      Admin-specific additions (future):
      ├─ Can trigger key rotation
      ├─ Can view detailed logs
      ├─ Can schedule maintenance
      └─ Can run automated tests
```

---

## 6. ERROR & EDGE CASE FLOWS

### **Voter - Vote Not Found**
```
Voter clicks "Vote Now" on open election
  │
  ├─ API check: Is voter eligible?
  │   ├─ YES → Proceed to voting modal
  │   └─ NO → Show error modal
  │       ├─ Title: "Not Eligible"
  │       ├─ Message: "You are not registered for this election"
  │       ├─ Action: Contact election official
  │       └─ [Close] button
```

### **Session Expired**
```
Voter is voting and session times out
  │
  ├─ API returns 401 Unauthorized
  └─ Modal shows error:
      ├─ Title: "Session Expired"
      ├─ Message: "Your session has expired. Please sign in again."
      ├─ Note: "Your vote was NOT submitted."
      └─ [Sign In] button → redirect to login
```

### **Network Error During Voting**
```
Voter confirms & encrypts, network fails
  │
  ├─ API times out or returns 500
  └─ Modal shows error:
      ├─ Title: "Submission Failed"
      ├─ Message: "Could not submit your ballot. Please try again."
      ├─ Note: "Encryption was successful. Your data is safe."
      └─ [Retry] button (state preserved)
```

### **Admin - Delete Confirmation**
```
Admin clicks [Delete] on election card
  │
  └─ CONFIRMATION MODAL
      ├─ Title: "Delete Election?"
      ├─ Description: "This action cannot be undone."
      ├─ Alert (red): "Are you sure? All votes and logs will be removed."
      ├─ [Cancel] button → closes modal
      └─ [Delete] button (danger variant)
          └─ Deletes election, removes from grid
```

---

## 7. RESPONSIVE DESIGN FLOWS

### **Tablet View (320px - 820px)**
- Sidebar collapses to icons only
- Grid layouts reduce from 4 cols → 2 cols
- Modal width adjusts to window
- Top bar menu becomes hamburger (future enhancement)

### **Mobile View (< 520px)**
- Single column layouts
- Full-width modals
- Sidebar hides, navigation via sidebar toggle
- All functional, no features removed

---

## 8. THEME TOGGLE FLOW

```
Any page
  │
  ├─ User clicks theme toggle button (Sun/Moon icon) in top bar
  │   │
  │   ├─ Current theme: DARK
  │   │   └─ Click → Switch to LIGHT
  │   │       ├─ All colors change to light variants
  │   │       ├─ Background: Dark blue → Light gray
  │   │       ├─ Text: Light → Dark
  │   │       ├─ Save to localStorage
  │   │       └─ Page re-renders with new theme
  │   │
  │   └─ Current theme: LIGHT
  │       └─ Click → Switch to DARK
  │           ├─ All colors revert to dark variants
  │           ├─ Background: Light gray → Dark blue
  │           ├─ Text: Dark → Light
  │           ├─ Save to localStorage
  │           └─ Page re-renders with new theme
  │
  └─ Theme persists across:
      ├─ Page reloads
      ├─ Navigation between pages
      ├─ Session end
      └─ Applies to all pages globally
```

---

## Summary

The platform supports 3 main user types:

1. **Anonymous Visitors** - Read-only access to Landing, Verify, Status Pages
2. **Voters** - Vote in elections, verify votes, view dashboard
3. **Admins** - Full control over elections, audit logs, system health

Each user type has a clear, focused flow with minimal cognitive load and maximum transparency.
