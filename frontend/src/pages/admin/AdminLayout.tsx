import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Vote,
  BarChart3,
  Shield,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useGovTheme } from "../../ui/useGovTheme";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

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
      {/* Sidebar */}
      <aside
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
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>Admin Panel</div>
            <div style={{ fontSize: 11, color: "var(--gov-muted)" }}>
              Election Control
            </div>
          </div>
        </div>

        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
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
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 26px",
            borderBottom: "1px solid var(--gov-edge)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{title}</h1>
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

        <main style={{ padding: "24px 26px", flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
