# E-Voting Platform Design System

## Overview

This document defines the complete UI/UX architecture for a government-grade e-voting platform. All pages and components extend the existing authentication pages' design language.

---

## 1. Color Palette & Theming

### CSS Variables (index.css)

**Dark Theme (default):**
- `--gov-bg`: `#071022` (base background)
- `--gov-ink`: `rgba(255,255,255,0.416)` (primary text)
- `--gov-muted`: `rgba(255,255,255,0.66)` (secondary text)
- `--gov-edge`: `rgba(255,255,255,0.11)` (borders)
- `--gov-gold`: `#c9a227` (accent/trust)
- `--gov-alert`: `#ff6b6b` (error/warning)
- `--gov-card`: `rgba(255,255,255,0.045)` (card bg)
- `--gov-card2`: `rgba(255,255,255,0.03)` (card variant)
- `--gov-shadow`: `0 18px 55px rgba(0,0,0,0.35)`

**Light Theme:**
- `--gov-bg`: `#f6f7fb`
- `--gov-ink`: `rgba(10,18,32,0.92)`
- `--gov-muted`: `rgba(0,0,0,0.62)`
- `--gov-edge`: `rgba(10,18,32,0.14)`
- `--gov-gold`: `#9a7a12`
- `--gov-alert`: `#b42318`
- `--gov-card`: `rgba(10,18,32,0.04)`
- `--gov-card2`: `rgba(10,18,32,0.02)`
- `--gov-shadow`: `0 18px 55px rgba(10,18,32,0.12)`

### Status Colors (New Additions)
- **Success**: Green `#47a76f` (dark) / `#2d6a3f` (light)
- **Warning**: Orange `#d97706` (dark) / `#b45309` (light)
- **Info**: Blue `#3b82f6` (dark) / `#1d4ed8` (light)
- **Inactive**: Gray `rgba(255,255,255,0.3)` (dark) / `rgba(10,18,32,0.3)` (light)

---

## 2. Typography

**Font Stack:** `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif`

| Element | Size | Weight | Letter-spacing | Usage |
|---------|------|--------|-----------------|--------|
| H1 Hero | 36px | 800 | 0.4px | Page hero headlines |
| H2 Section | 24px | 900 | 0.2px | Section titles |
| H3 Subsection | 18px | 700 | 0.2px | Cards, components |
| Body | 14px | 400 | 0 | Default content |
| Body Small | 13px | 400 | 0 | Secondary content |
| Label | 13px | 500 | 0 | Form labels |
| Caption | 12px | 400 | 0.4px | Captions, hints |

---

## 3. Spacing System

```
Base unit: 2px
Scale: 6px, 8px, 10px, 12px, 14px, 16px, 18px, 20px, 21px, 26px, 34px, 40px
```

**Common Spacings:**
- Form gaps: `12px`
- Component gaps: `13px`
- Section gaps: `21px`
- Page padding: `34px` (vertical), `16px` (horizontal)
- Container max-width: `1200px`

---

## 4. Border Radius

```
Buttons/Inputs: 12px
Pills/Labels: 14px
Cards/Sections: 16px - 18px
```

---

## 5. Component Library

### Buttons
- `.govBtn` - Default secondary button
- `.govBtnPrimary` - Gold accent button

### Form Elements
- `.govForm` - Form container
- `.govLabel` - Label wrapper
- `.govInput` - Input field
- `.govDivider` - Horizontal divider

### Layout
- `.govPage` - Full page wrapper
- `.govTopBar` - Fixed header with blur
- `.govMain` - Content container (1200px max)
- `.govHero` - Hero section (full viewport)

### Content
- `.govSectionCard` - Content card with gradient
- `.govSectionTitle` - Section heading
- `.govSectionText` - Section body

### Grids
- `.govPillGrid` - 4 columns, responsive (2col < 980px, 1col < 520px)
- `.govFeatureGrid` - 2 columns, responsive (1col < 820px)
- `.govGrid2` - 2 columns, responsive (1col < 560px)

---

## 6. Component States

### Button States
- Default: `background: rgba(255,255,255,0.05)`
- Hover: `background: rgba(255,255,255,0.07)`
- Primary: `border: rgba(201,162,39,0.62); background: rgba(201,162,39,0.19)`
- Primary Hover: `background: rgba(201,162,39,0.25)`
- Disabled: `opacity: 0.5; cursor: not-allowed`

### Input States
- Default: `border: var(--gov-edge)`
- Focus: `border: rgba(201,162,39,0.58); box-shadow: 0 0 0 4px rgba(201,162,39,0.11)`
- Error: `border: var(--gov-alert); box-shadow: 0 0 0 4px rgba(255,107,107,0.11)`

---

## 7. Responsive Breakpoints

```
Mobile: < 520px
Tablet: 520px - 820px
Desktop: > 820px
Large: 1200px+
```

---

## 8. Icon System

Use **lucide-react** icons. Common icons:

**Security:** Lock, Shield, Fingerprint, Eye, EyeOff, CheckCircle2, AlertTriangle
**Navigation:** Menu, X, ChevronDown, Home, LogOut
**Status:** CheckCircle2, AlertTriangle, Info, Clock, TrendingUp
**Actions:** Edit, Trash2, Download, Share2, MoreVertical
**Voting:** FileCheck2, Ballot, UsersIcon, Vote

---

## 9. Shadows

**Default Shadow:** `0 18px 55px rgba(0,0,0,0.35)` (dark) or `rgba(10,18,32,0.12)` (light)
**Subtle Shadow (hover):** `0 8px 20px rgba(0,0,0,0.15)` (dark)

---

## 10. Animation Guidelines

**Approved animations:**
- Scroll hints: `govScrollAnim` (subtle pulse)
- Button hover: `background` transition `150ms`
- Threshold reveals: IntersectionObserver-based
- Modal fade: `opacity` transition `180ms`

**Avoided animations:**
- No bounce effects
- No parallax (reduces trust)
- No auto-playing animations
- No spinning loaders (too playful)

---

## 11. Accessibility (WCAG 2.1 AA)

- Contrast ratio: ≥ 4.5:1 for text
- Focus indicators: Always visible (gold border)
- ARIA labels on interactive elements
- Semantic HTML (button, a, form, fieldset, etc.)
- Keyboard navigation: Tab, Enter, Space, Escape
- No color-only information transfer

---

## 12. Layout Types

### PublicLayout
Used for: Landing, Verification, Public Transparency, System Status
- Fixed top bar
- Hero section
- Scrollable content sections
- Footer

### AdminLayout
Used for: Admin Dashboard
- Fixed sidebar (left)
- Top bar (right of sidebar)
- Main content area
- Responsive sidebar collapse

### DashboardLayout
Used for: Voter Dashboard
- Simplified top bar
- Full-width content
- Card-based layout
- Optional sidebar for quick actions

---

## 13. Component Hierarchy

```
App
├── PublicLayout
│   ├── TopBar
│   ├── Hero Section
│   ├── Content Sections
│   └── Footer
├── AdminLayout
│   ├── Sidebar
│   ├── TopBar
│   └── Main Content
└── DashboardLayout
    ├── TopBar
    └── Main Content
```

---

## 14. Next Steps

All new pages should:
1. Import and use CSS variables from `index.css`
2. Extend `.govBtn`, `.govInput`, etc. classes
3. Maintain existing theme toggle functionality
4. Use lucide-react for icons
5. Ensure 1200px max-width constraint
6. Test in both dark and light modes
7. Validate responsive breakpoints
8. Maintain WCAG AA compliance

---
