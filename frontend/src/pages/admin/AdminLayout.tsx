import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Vote,
  BarChart3,
  Shield,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { useGovTheme } from "../../ui/useGovTheme";

const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const NAV = [
  { to: "/admin", label: "Overview", icon: <LayoutDashboard size={18} />, end: true },
  { to: "/admin/elections", label: "Elections", icon: <Vote size={18} />, end: false },
  { to: "/admin/results", label: "Results & Audit", icon: <BarChart3 size={18} />, end: false },
];

export default function AdminLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { theme, toggle } = useGovTheme();
  const nav = useNavigate();
  // Below 900px the sidebar becomes a slide-in drawer.
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
    } catch {
      /* ignore */
    } finally {
      nav("/login", { replace: true });
    }
  }

  return (
    <div className="govPage" style={{ display: "flex", minHeight: "100vh" }}>
      {menuOpen && <div className="gv-admin-scrim" onClick={() => setMenuOpen(false)} aria-hidden />}
      {/* Sidebar */}
      <aside
        className={`gv-admin-side${menuOpen ? " open" : ""}`}
        aria-label="Admin navigation"
        style={{
          width: 244,
          flexShrink: 0,
          borderRight: "1px solid var(--gov-edge)",
          background: "rgba(255,255,255,0.02)",
          padding: "20px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 10px 18px",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: "rgba(201,162,39,0.16)",
              border: "1px solid rgba(201,162,39,0.35)",
              color: "var(--gov-gold, #c9a227)",
            }}
          >
            <Shield size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 15 }}>Admin Panel</div>
            <div style={{ fontSize: 11, color: "var(--gov-muted)" }}>
              Election Control
            </div>
          </div>
          <button type="button" className="govBtn gv-show-admin-sm" aria-label="Close menu" onClick={() => setMenuOpen(false)} style={{ width: 44, padding: 0 }}>
            <X size={18} />
          </button>
        </div>

        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMenuOpen(false)}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 12px",
              borderRadius: 12,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
              color: isActive ? "var(--gov-ink)" : "var(--gov-muted)",
              background: isActive ? "rgba(201,162,39,0.14)" : "transparent",
              border: isActive
                ? "1px solid rgba(201,162,39,0.3)"
                : "1px solid transparent",
            })}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        <div style={{ marginTop: "auto", display: "grid", gap: 6 }}>
          <button
            type="button"
            className="govBtn"
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              fontSize: 13,
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          className="gv-admin-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "18px 26px",
            borderBottom: "1px solid var(--gov-edge)",
          }}
        >
          <button type="button" className="govBtn gv-show-admin-sm" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} style={{ width: 44, padding: 0, flexShrink: 0 }}>
            <Menu size={20} />
          </button>
          <h1 style={{ margin: 0, fontSize: "clamp(17px, 4.6vw, 22px)", fontWeight: 900, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{title}</h1>
          <button
            type="button"
            className="govBtn"
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            style={{ padding: "9px 11px" }}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="gv-admin-main" style={{ padding: "24px 26px", flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
