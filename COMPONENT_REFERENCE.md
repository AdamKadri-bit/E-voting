# E-Voting Platform - Component Reference Guide

Quick reference for all 27 components and their props.

---

## Layout Components

### **PublicLayout**
Used for: Landing, Verification, System Status pages
```tsx
interface PublicLayoutProps {
  children: ReactNode;
}

<PublicLayout>
  {/* Your content */}
</PublicLayout>
```
- Fixed top bar with logo, theme toggle
- Scrollable hero section
- Scrollable content sections
- Footer with links
- Responsive design

---

### **DashboardLayout**
Used for: Voter Dashboard
```tsx
interface DashboardLayoutProps {
  userEmail?: string;           // default: "user@example.com"
  userRole?: "voter" | "admin"; // default: "voter"
  onLogout?: () => void;        // logout handler
  children: ReactNode;
}

<DashboardLayout
  userEmail="voter@vote.local"
  userRole="voter"
  onLogout={() => navigate('/login')}
>
  {/* Your content */}
</DashboardLayout>
```
- Fixed top bar with user profile dropdown
- Theme toggle
- Security footer banner
- Responsive design

---

### **AdminLayout**
Used for: Admin Dashboard
```tsx
interface AdminLayoutProps {
  userEmail?: string;                      // default: "admin@example.com"
  onLogout?: () => void;                   // logout handler
  currentPage?: string;                    // active page id
  onNavigate?: (page: string) => void;    // navigation handler
  children: ReactNode;
}

<AdminLayout
  userEmail="admin@election.local"
  currentPage="overview"
  onNavigate={(page) => setCurrentPage(page)}
  onLogout={() => navigate('/login')}
>
  {/* Your content */}
</AdminLayout>
```
- Fixed collapsible sidebar with menu
- Fixed top bar with user profile
- Main content area
- Menu items: Overview, Create, Manage, Candidates, Voters, Audit, Results, Status

---

## Common Components

### **Card**
```tsx
interface CardProps {
  children: ReactNode;
  clickable?: boolean;           // default: false
  onClick?: () => void;
}

<Card clickable onClick={() => {}}>
  Content here
</Card>
```
- Gradient background, border, shadow
- Hover effects when clickable

---

### **Section**
```tsx
interface SectionProps {
  children: ReactNode;
  title: string;                 // required
  description?: string;
}

<Section title="Title" description="Optional description">
  Content here
</Section>
```
- Format: H2 title + optional description + children
- Full width

---

### **Badge**
```tsx
interface BadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
}

<Badge label="Voting Open" variant="success" />
```
- Color variants:
  - default: Gold
  - success: Green
  - warning: Orange
  - error: Red
  - info: Blue

---

### **StatusIndicator**
```tsx
interface StatusIndicatorProps {
  status: "active" | "inactive" | "pending" | "error";
  label?: string;
}

<StatusIndicator status="active" label="Running" />
```
- Colored dot + label
- Animates on "active" status

---

### **Metric**
```tsx
interface MetricProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;        // lucide-react icon
}

<Metric
  label="Total Votes"
  value={12847}
  subtext="Real-time count"
  icon={<TrendingUp size={18} />}
/>
```
- Icon box + label + large value + optional subtext

---

### **Divider**
```tsx
interface DividerProps {
  text?: string;
}

<Divider text="or" />
```
- Horizontal line with optional center text

---

### **Modal**
```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;            // button nodes
  maxWidth?: string;             // default: "500px"
}

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirm Vote"
  description="Review your choice"
  footer={[
    <Button key="cancel" onClick={() => {}}>Cancel</Button>,
    <Button key="confirm" variant="primary">Confirm</Button>
  ]}
>
  <p>Modal content here</p>
</Modal>
```
- Centered with backdrop blur
- Animated entry
- Close button built-in

---

### **Alert**
```tsx
interface AlertProps {
  variant: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
}

<Alert
  variant="success"
  title="Vote Confirmed"
  message="Your ballot was encrypted and submitted."
/>
```
- Color-coded boxes
- Optional title + required message

---

### **Button**
```tsx
interface ButtonProps {
  children: ReactNode;
  variant?: "default" | "primary" | "danger"; // default: "default"
  size?: "sm" | "md" | "lg";                  // default: "md"
  onClick?: () => void;
  disabled?: boolean;                         // default: false
  type?: "button" | "submit" | "reset";       // default: "button"
}

<Button variant="primary" size="lg" onClick={() => {}}>
  Send Vote
</Button>
```
- Variants:
  - default: Subtle gray
  - primary: Gold accent
  - danger: Red

- Sizes:
  - sm: 8px padding, 12px font
  - md: 11px padding, 13px font (default)
  - lg: 14px padding, 14px font

---

### **ButtonGroup**
```tsx
interface ButtonGroupProps {
  children: ReactNode;
}

<ButtonGroup>
  <Button onClick={() => {}}>Cancel</Button>
  <Button variant="primary" onClick={() => {}}>Confirm</Button>
</ButtonGroup>
```
- Flex container with consistent gap

---

### **FormField**
```tsx
interface FormFieldProps {
  label: string;
  required?: boolean;            // default: false
  error?: string;
  children: ReactNode;           // input element
}

<FormField label="Email" required error="">
  <input className="govInput" type="email" />
</FormField>
```
- Wrapper for form inputs
- Auto-adds required indicator (*)
- Shows error message in red

---

## Dashboard Components

### **ElectionCard**
```tsx
interface ElectionCardProps {
  id: string;
  title: string;
  status: "open" | "closed" | "upcoming";
  startTime?: Date;
  endTime?: Date;
  totalCandidates?: number;      // default: 0
  votedAt?: Date;
  onClick?: () => void;
}

<ElectionCard
  id="1"
  title="Presidential Election"
  status="open"
  startTime={new Date()}
  endTime={new Date()}
  totalCandidates={5}
  onClick={() => openVoting()}
/>
```
- Status badge
- Timing info
- Vote status if already voted
- CTA button when open and not voted

---

### **VoteCandidate**
```tsx
interface VoteCandidateProps {
  id: string;
  name: string;
  party?: string;
  biography?: string;
  isSelected?: boolean;          // default: false
  onSelect?: (id: string) => void;
}

<VoteCandidate
  id="1"
  name="Sarah Johnson"
  party="Democratic Alliance"
  biography="Healthcare reform advocate"
  isSelected={selectedId === "1"}
  onSelect={(id) => setSelected(id)}
/>
```
- Selectable button with checkbox
- Shows name, party, bio
- Hover effects

---

### **SecurityBanner**
```tsx
interface SecurityBannerProps {
  message: string;
  icon?: ReactNode;              // lucide-react icon
  variant?: "info" | "success" | "warning"; // default: "info"
}

<SecurityBanner
  message="Your ballot is encrypted end-to-end"
  icon={<Lock size={16} />}
  variant="success"
/>
```
- Info text with icon
- Color-coded by variant

---

### **VoteReceipt**
```tsx
interface ReceiptProps {
  voteHash: string;
  encryptionKey?: string;
  timestamp?: Date;
  election?: string;
}

<VoteReceipt
  voteHash="0xabc123def456..."
  encryptionKey="0x789ghi101jkl..."
  timestamp={new Date()}
  election="Presidential 2026"
/>
```
- Monospace display
- Shows hash, key, timestamp, election
- Copyable format

---

### **CountdownTimer**
```tsx
interface CountdownTimerProps {
  endTime: Date;
}

<CountdownTimer endTime={electionEnd} />
```
- Real-time countdown
- Formats: "1d 5h", "2h 30m", "5m 12s"
- Updates every second

---

## Admin Components

### **AdminElectionCard**
```tsx
interface AdminElectionCardProps {
  id: string;
  title: string;
  status: "draft" | "scheduled" | "active" | "closed" | "archived";
  startTime: Date;
  endTime: Date;
  registeredVoters?: number;     // default: 0
  votesReceived?: number;        // default: 0
  turnoutLoading?: boolean;      // default: false
  onEdit?: (id: string) => void;
  onStart?: (id: string) => void;
  onStop?: (id: string) => void;
  onDelete?: (id: string) => void;
}

<AdminElectionCard
  id="1"
  title="Board Election"
  status="active"
  startTime={new Date()}
  endTime={new Date()}
  registeredVoters={1000}
  votesReceived={850}
  onEdit={(id) => {}}
  onStart={(id) => {}}
  onStop={(id) => {}}
  onDelete={(id) => {}}
/>
```
- Status badge
- Timing, voter count, vote count
- Turnout % visualization
- Action buttons (Edit, Start, Stop, Delete)

---

### **AuditLogEntry**
```tsx
interface AuditLogEntryProps {
  timestamp: Date;
  eventType: "LOGIN" | "VOTE_CAST" | "ELECTION_START" | 
             "ELECTION_CLOSED" | "ADMIN_ACTION" | "KEY_ROTATION";
  actor: string;
  actorRole: "voter" | "admin" | "system";
  details?: string;
}

<AuditLogEntry
  timestamp={new Date()}
  eventType="VOTE_CAST"
  actor="anonymous"
  actorRole="voter"
  details="Presidential Election"
/>
```
- Color-coded by event type
- Shows timestamp, actor, role, details

---

### **SystemHealth**
```tsx
interface SystemHealthProps {
  cpuUsage: number;              // 0-100
  memoryUsage: number;           // 0-100
  activeConnections: number;
  databaseStatus: "healthy" | "degraded" | "offline";
  encryptionStatus: "active" | "error";
  lastAuditTime: Date;
}

<SystemHealth
  cpuUsage={34}
  memoryUsage={42}
  activeConnections={12847}
  databaseStatus="healthy"
  encryptionStatus="active"
  lastAuditTime={new Date()}
/>
```
- CPU/Memory progress bars
- Connection count
- Status badges for DB and encryption
- Last audit timestamp

---

## Import Patterns

### **Option 1: Import from components/index.ts (Recommended)**
```tsx
import {
  Card, Section, Badge,
  Modal, Alert, Button,
  ElectionCard, VoteCandidate,
  AdminElectionCard, SystemHealth
} from '@/components';
```

### **Option 2: Direct import**
```tsx
import { Card, Section, Badge } from '@/components/common/Card';
import { Modal, Alert, Button } from '@/components/common/Modal';
import { ElectionCard } from '@/components/dashboard/DashboardComponents';
```

### **Option 3: Layout imports**
```tsx
import PublicLayout from '@/components/layouts/PublicLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AdminLayout from '@/components/layouts/AdminLayout';
```

---

## Common Patterns

### **Form with validation**
```tsx
const [email, setEmail] = useState("");
const [error, setError] = useState("");

const handleSubmit = (e) => {
  e.preventDefault();
  if (!email.includes("@")) {
    setError("Invalid email");
    return;
  }
  // Submit...
};

<form className="govForm" onSubmit={handleSubmit}>
  <FormField label="Email" required error={error}>
    <input
      className="govInput"
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />
  </FormField>
  <Button type="submit" variant="primary">Submit</Button>
</form>
```

### **Modal with loading state**
```tsx
const [isLoading, setIsLoading] = useState(false);

<Modal isOpen={isOpen} onClose={onClose} title="Confirm">
  <p>Are you sure?</p>
  <Button
    onClick={async () => {
      setIsLoading(true);
      await doSomething();
      setIsLoading(false);
      onClose();
    }}
    disabled={isLoading}
  >
    {isLoading ? "Loading..." : "Confirm"}
  </Button>
</Modal>
```

### **Conditional badge**
```tsx
<Badge
  label={election.status.toUpperCase()}
  variant={
    election.status === "open" ? "success" :
    election.status === "closed" ? "default" :
    "info"
  }
/>
```

### **Grid of cards**
```tsx
<div style={{
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "16px"
}}>
  {items.map(item => (
    <Card key={item.id} clickable onClick={() => {}}>
      {/* Content */}
    </Card>
  ))}
</div>
```

---

## CSS Classes (Already Defined)

These classes are already in `index.css`. Use them directly:

```tsx
// Button styles
<button className="govBtn">Default Button</button>
<button className="govBtn govBtnPrimary">Primary Button</button>

// Form styles
<form className="govForm">
  <label className="govLabel">
    <span>Label</span>
    <input className="govInput" />
  </label>
</form>

// Layout classes
<div className="govPage">
  <div className="govMain">
    <div className="govHero">
      {/* Hero content */}
    </div>
    <div className="govSections">
      <div className="govSectionCard">
        {/* Section content */}
      </div>
    </div>
  </div>
</div>

// Grids
<div className="govPillGrid">     {/* 4 cols, responsive */}
<div className="govFeatureGrid">  {/* 2 cols, responsive */}
<div className="govGrid2">        {/* 2 cols, responsive */}
```

---

## Theme Variables (Already Defined)

```css
/* Dark theme (default) */
--gov-bg: #071022
--gov-ink: rgba(255,255,255,0.416)
--gov-muted: rgba(255,255,255,0.66)
--gov-edge: rgba(255,255,255,0.11)
--gov-gold: #c9a227
--gov-alert: #ff6b6b
--gov-card: rgba(255,255,255,0.045)
--gov-card2: rgba(255,255,255,0.03)
--gov-shadow: 0 18px 55px rgba(0,0,0,0.35)

/* Light theme */
--gov-bg: #f6f7fb
--gov-ink: rgba(10,18,32,0.92)
--gov-muted: rgba(0,0,0,0.62)
--gov-edge: rgba(10,18,32,0.14)
--gov-gold: #9a7a12
--gov-alert: #b42318
--gov-card: rgba(10,18,32,0.04)
--gov-card2: rgba(10,18,32,0.02)
--gov-shadow: 0 18px 55px rgba(10,18,32,0.12)
```

Use these in `style` attributes:
```tsx
<div style={{ color: "var(--gov-gold)" }}>Golden text</div>
<div style={{ background: "var(--gov-card)" }}>Card background</div>
<div style={{ borderColor: "var(--gov-edge)" }}>Border color</div>
```

---

This is your complete component API reference. All 27 components are documented with their props, usage examples, and styling information.
