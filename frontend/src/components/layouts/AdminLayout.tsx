import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useGovTheme } from "../../ui/useGovTheme";
import {
  Sun,
  Moon,
  Lock,
  LogOut,
  ChevronDown,
  Menu,
  X,
  BarChart3,
  Users,
  FileText,
  LayoutGrid,
  Plus,
  Activity,
  Home,
  Shield,
} from "lucide-react";
import { useState } from "react";

type AdminLayoutProps = {
  userEmail?: string;
  onLogout?: () => void;
  currentPage?: string;
  onNavigate?: (page: string) => void;
  children: ReactNode;
};

const MENU_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "create-election", label: "Create Election", icon: Plus },
  { id: "elections", label: "Manage Elections", icon: BarChart3 },
  { id: "candidates", label: "Candidates", icon: Users },
  { id: "voters", label: "Voter Management", icon: Users },
  { id: "audit", label: "Audit Logs", icon: FileText },
  { id: "results", label: "Results", icon: BarChart3 },
  { id: "status", label: "System Status", icon: Activity },
];

export default function AdminLayout({
  userEmail = "admin@example.com",
  onLogout = () => {},
  currentPage = "overview",
  onNavigate = () => {},
  children,
}: AdminLayoutProps) {
  const { theme, toggle } = useGovTheme();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="govPage" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? "240px" : "60px",
          background: "rgba(255,255,255,0.02)",
          borderRight: "1px solid var(--gov-edge)",
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          overflowY: "auto",
          transition: "width 200ms ease",
          zIndex: 70,
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: "16px 14px",
            borderBottom: "1px solid var(--gov-edge)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            minHeight: "68px",
          }}
        >
          {sidebarOpen && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="govSealBox" style={{ width: 36, height: 36 }}>
                <Lock size={18} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: 0.4 }}>
                  EVOTE
                </div>
                <div style={{ fontSize: "10px", color: "var(--gov-muted)" }}>Admin</div>
              </div>
            </div>
          )}
          <button
            type="button"
            className="govBtn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ padding: "8px", minWidth: "auto" }}
            title="Toggle sidebar"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav style={{ padding: "12px 8px" }}>
          {MENU_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                style={{
                  width: "100%",
                  padding: "12px 10px",
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border: isActive ? "1px solid rgba(201,162,39,0.5)" : "1px solid var(--gov-edge)",
                  borderRadius: "10px",
                  background: isActive
                    ? "rgba(201,162,39,0.15)"
                    : "rgba(255,255,255,0.03)",
                  color: isActive ? "var(--gov-gold)" : "var(--gov-muted)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "12px",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 150ms ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.borderColor = "rgba(201,162,39,0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "var(--gov-edge)";
                  }
                }}
              >
                <IconComponent size={16} strokeWidth={1.5} />
                {sidebarOpen && item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "12px 8px",
              borderTop: "1px solid var(--gov-edge)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <button
              type="button"
              className="govBtn"
              onClick={toggle}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "10px 12px",
                marginBottom: "8px",
              }}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              className="govBtn"
              onClick={onLogout}
              style={{
                width: "100%",
                justifyContent: "flex-start",
                padding: "10px 12px",
                fontSize: "12px",
              }}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div
        style={{
          marginLeft: sidebarOpen ? "240px" : "60px",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* Top Bar */}
        <div
          className="govTopBar"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            left: sidebarOpen ? "240px" : "60px",
            zIndex: 60,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ fontSize: "14px", color: "var(--gov-muted)" }}>
                Admin Dashboard
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  background: "rgba(201,162,39,0.2)",
                  border: "1px solid rgba(201,162,39,0.4)",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--gov-gold)",
                  letterSpacing: 0.3,
                }}
              >
                <Shield size={12} strokeWidth={2.5} />
                ADMIN MODE
              </div>
            </div>
          </div>

          <div className="govTopBarRight" style={{ gap: "16px" }}>
            {/* Home Button */}
            <button
              type="button"
              className="govBtn"
              onClick={() => navigate("/")}
              title="Go to home"
              style={{ padding: "10px 12px" }}
            >
              <Home size={18} />
            </button>

            {/* User Profile */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="govBtn"
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                }}
              >
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                    {userEmail}
                  </div>
                </div>
                <ChevronDown size={16} />
              </button>

              {showDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    background: "var(--gov-card)",
                    border: "1px solid var(--gov-edge)",
                    borderRadius: "12px",
                    zIndex: 100,
                    minWidth: "200px",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <button
                    type="button"
                    onClick={onLogout}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      border: "none",
                      background: "none",
                      color: "var(--gov-ink)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "13px",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: "96px 20px 40px", overflowY: "auto" }}>
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
