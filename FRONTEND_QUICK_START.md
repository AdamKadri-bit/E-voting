# Frontend Quick Start Guide

Get your E-voting platform frontend running in 2 minutes.

---

## 🚀 Quick Start (Development)

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (if not done yet)
npm install

# 3. Start development server
npm run dev
```

Your app will be available at: **http://localhost:5173**

---

## 🌐 Pages to Visit

| Page | URL | Purpose |
|------|-----|---------|
| **Landing** | http://localhost:5173/landing | Public homepage |
| **Verification** | http://localhost:5173/verify | Vote verification |
| **System Status** | http://localhost:5173/system-status | Public infrastructure status |
| **Voter Dashboard** | http://localhost:5173/voter/dashboard | Vote casting |
| **Admin Dashboard** | http://localhost:5173/admin | Election management |
| **Sign In** | http://localhost:5173/login | Login (existing) |
| **Sign Up** | http://localhost:5173/signup | Registration (existing) |

---

## 🎨 Try the Features

### On Landing Page
1. Click the **Sun/Moon icon** (top-right) to toggle dark/light theme
2. Hover over security pillars - they highlight in gold
3. Scroll down to see transparency metrics
4. Try the "Verify Vote" form input

### On Verification Page
1. Enter any receipt hash in the form
2. Shows mock success state with vote details
3. Click "Copy" to copy hash to clipboard
4. Check FAQ section

### On System Status Page
1. View overall system health
2. See infrastructure metrics
3. Check security indicators

### On Voter Dashboard
1. See 3 mock elections: Open, Closed, Upcoming
2. Click "Vote Now" on the open election
3. **Select a candidate** (click checkbox)
4. Click "Continue"
5. Review your choice
6. Click "Confirm & Encrypt" - watch progress bar
7. View receipt hash - copy it!
8. Click "Done"

### On Admin Dashboard
1. See sidebar with 8 menu items (Overview, Create, Manage, etc.)
2. Click sidebar items to jump between pages
3. See 4 KPI cards on Overview
4. Click "+ Create New Election" to see form modal
5. Click "Edit" on an election to trigger update
6. Click "Delete" to see confirmation modal
7. Watch the sidebar toggle button on small screens

---

## 🎨 Theme Toggle (Everywhere)

**Dark Theme** (default):
- Background: Deep blue (#071022)
- Text: Bright white
- Gold accent: Bright gold (#c9a227)

**Light Theme**:
- Background: Off-white (#f6f7fb)
- Text: Dark blue
- Gold accent: Dark gold (#9a7a12)

Click the **Sun/Moon icon** in the top-right corner to toggle.

---

## 📁 Key Files to Know

```
frontend/
├── src/
│   ├── components/
│   │   ├── layouts/          ← PublicLayout, DashboardLayout, AdminLayout
│   │   ├── common/           ← Card, Modal, Button, Badge, etc.
│   │   ├── dashboard/        ← ElectionCard, VoteCandidate, etc.
│   │   ├── admin/            ← AdminElectionCard, AuditLogEntry, etc.
│   │   └── index.ts          ← Import everything from here
│   ├── pages/
│   │   ├── public/           ← LandingPage, VerificationPage, SystemStatusPage
│   │   ├── voter/            ← VoterDashboard
│   │   └── admin/            ← AdminDashboard
│   ├── App.tsx               ← Route configuration
│   ├── main.tsx              ← Entry point
│   ├── index.css             ← Design tokens, CSS variables
│   └── (other files)
├── package.json              ← Dependencies
├── vite.config.ts            ← Build config
└── tsconfig.json             ← TypeScript config
```

---

## 🛠️ Common Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build           # Build for production
npm run preview         # Preview production build locally

# Linting & Testing
npm run lint            # Check code style
npm run type-check      # TypeScript check
npm test                # Run tests (if configured)
```

---

## 🔀 Component Imports

**Import from central export:**
```typescript
import { Card, Button, Modal, InputField } from '@/components';
import { PublicLayout, DashboardLayout, AdminLayout } from '@/components';
```

**Don't import directly from files:**
```typescript
// ❌ Avoid
import Card from '@/components/common/Card';

// ✅ Use instead
import { Card } from '@/components';
```

---

## 🎯 Mock Data Notes

All pages use **mock data** currently. When ready to integrate with backend:

1. **Voter Dashboard** - Replace mock elections in `VoterDashboard.tsx` line ~75
2. **Verification Page** - Replace mock verification logic in `VerificationPage.tsx` line ~30
3. **Admin Dashboard** - Replace mock election data in `AdminDashboard.tsx` line ~88
4. **System Status** - Replace mock metrics in `SystemStatusPage.tsx` line ~5

See **IMPLEMENTATION_SUMMARY.md** → "Next Steps" section for API endpoints to implement.

---

## 🎨 Styling System

All styling uses **CSS Variables** (no Tailwind):

```css
/* Colors */
--gov-gold: #c9a227 (light: #9a7a12)
--gov-bg: #071022 (light: #f6f7fb)
--gov-card: rgba(255, 255, 255, 0.06)
--gov-text: rgba(255, 255, 255, 0.72)
--gov-muted: rgba(255, 255, 255, 0.416)

/* Spacing */
--spacing-xs: 6px
--spacing-sm: 12px
--spacing-md: 18px
--spacing-lg: 24px
--spacing-xl: 34px

/* Shadows */
--gov-shadow: 0 2px 4px rgba(0,0,0,0.1)
--gov-shadow-lg: 0 8px 16px rgba(0,0,0,0.1)
```

---

## 🧩 Component Library (27 components)

### Layouts (3)
- `PublicLayout` - For public pages (header, content, footer)
- `DashboardLayout` - For voter dashboard (header, main, security banner)
- `AdminLayout` - For admin pages (sidebar, header, main)

### Cards & Display (6)
- `Card` - Styled card container
- `Section` - Section with title
- `Badge` - Status badge (5 variants)
- `StatusIndicator` - Animated status dot
- `Metric` - Metric display (icon + value)
- `Divider` - Horizontal divider

### Forms & Inputs (5)
- `FormField` - Label + input wrapper
- `InputField` - Text input (in Modal.tsx)
- `Button` - Clickable button (3 variants)
- `ButtonGroup` - Button cluster
- `Modal` - Dialog container

### Alerts (1)
- `Alert` - Alert/notification (4 variants)

### Dashboard (5)
- `ElectionCard` - Election display card
- `VoteCandidate` - Candidate selection card
- `SecurityBanner` - Security message
- `VoteReceipt` - Receipt hash display
- `CountdownTimer` - Election countdown

### Admin (3)
- `AdminElectionCard` - Admin election management
- `AuditLogEntry` - Audit log row
- `SystemHealth` - System metrics display

---

## 📱 Responsive Breakpoints

The design is **fully responsive**:

- **Mobile**: < 520px (1 column, full-width forms)
- **Tablet**: 520px - 820px (2 columns, reduced sidebar)
- **Desktop**: > 820px (multi-column, full sidebar)
- **Large**: > 1200px (max content width)

Try resizing your browser or testing on mobile!

---

## 🔍 Browser DevTools Tips

### Check Theme Variables
1. Open DevTools (F12)
2. Right-click on any element → Inspect
3. Go to **Styles** tab
4. Look for `data-theme` attribute on `<html>`
5. Scroll through declared variables (should see `--gov-gold`, `--gov-bg`, etc.)

### Debug Components
1. Install **React DevTools** browser extension
2. Open DevTools → Components tab
3. Browse component tree
4. Inspect props in right panel

### Check Responsive Design
1. Press `Ctrl+Shift+M` (or Cmd+Shift+M on Mac) for responsive mode
2. Change device/dimensions
3. Check page responsiveness

---

## ⚠️ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Dark theme not working | Refresh browser (F5) or clear cache |
| Components not styling | Check browser DevTools for CSS variables |
| Form inputs look broken | Verify classes in input element |
| Modal backdrop is hidden | Check z-index in index.css |
| Buttons not clickable | Verify `onClick` handler in component |
| Sidebar not collapsing | Check breakpoint logic (520px, 820px) |
| Images not showing | Icons from lucide-react should load automatically |

---

## 📚 Documentation Files

- **DESIGN_SYSTEM.md** - Design tokens & specifications
- **FRONTEND_ARCHITECTURE.md** - Complete architecture guide
- **COMPONENT_REFERENCE.md** - API reference for all components
- **USER_FLOWS.md** - UX flow diagrams
- **IMPLEMENTATION_SUMMARY.md** - Summary & next steps

---

## 🚀 Next Steps

1. **✅ Get it running** - Follow "Quick Start" above
2. **✅ Test all pages** - Visit each URL listed in "Pages to Visit"
3. **✅ Try the features** - Follow "Try the Features" section
4. **📋 Review checklist** - See FRONTEND_CHECKLIST.md
5. **🔗 Integrate backend** - See IMPLEMENTATION_SUMMARY.md → "Phase 2"

---

## 💡 Pro Tips

1. **Theme persists** - Automatically saved to localStorage
2. **Form state** - Not persisted (use localStorage if needed)
3. **Loading states** - Add your own spinner component if needed
4. **Error handling** - Wrap API calls with try/catch
5. **Accessibility** - All components WCAG 2.1 AA compliant

---

## 🆘 Need Help?

Check these files in order:
1. **FRONTEND_CHECKLIST.md** - Troubleshooting section
2. **COMPONENT_REFERENCE.md** - Component API details
3. **FRONTEND_ARCHITECTURE.md** - Architecture deep-dive
4. **IMPLEMENTATION_SUMMARY.md** - Integration points

---

## 🎉 You're Ready!

Your E-voting frontend is fully functional and ready to use. Start with the landing page, explore all pages, test the voting flow, and then integrate with your backend.

Good luck! 🗳️
