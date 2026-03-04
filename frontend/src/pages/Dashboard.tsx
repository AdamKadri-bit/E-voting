// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Vote, Eye, BarChart3, LogOut, Lock } from "lucide-react";

import DashboardLayout from "../components/layouts/DashboardLayout";
import { Card, Section } from "../components/common/Card";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

type DbUser = {
  id?: number | string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  email_verified_at?: string | null;
  email_verified?: boolean;
};

type MeResponse = {
  ok?: boolean;
  user?: DbUser;
  message?: string;
  error?: string;
};

export default function Dashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<DbUser | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"logout" | null>(null);

  async function fetchMe() {
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/me`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      if (res.status === 401 || res.status === 403) {
        nav("/login", { replace: true });
        return;
      }

      const j = (await res.json().catch(() => null)) as MeResponse | null;

      if (!res.ok) {
        setErr(
          j?.message || j?.error || `Could not load session (${res.status}).`
        );
        return;
      }

      if (!j?.user) {
        setErr("Session request succeeded but response has no user.");
        return;
      }

      setMe(j.user);
    } catch (e: any) {
      setErr(e?.message || "Could not load your session.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setBusy("logout");
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
    } catch {
      // ignore
    } finally {
      setBusy(null);
      nav("/login", { replace: true });
    }
  }

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verified = !!me?.email_verified_at || !!me?.email_verified;
  const userRole: "voter" | "admin" = me?.role === "admin" ? "admin" : "voter";

  const options = [
    {
      icon: <Vote size={28} />,
      title: "Vote in Election",
      description: "Coming next.",
      action: () => alert("Not added yet."),
      color: "#47a76f",
      enabled: false,
    },
    {
      icon: <Eye size={28} />,
      title: "Verify Your Vote",
      description: "Coming next.",
      action: () => alert("Not added yet."),
      color: "#3b82f6",
      enabled: false,
    },
    {
      icon: <BarChart3 size={28} />,
      title: "System Status",
      description: "Coming next.",
      action: () => alert("Not added yet."),
      color: "#f59e0b",
      enabled: false,
    },
    {
      icon: <Shield size={28} />,
      title: "Admin Dashboard",
      description: "Later.",
      action: () => alert("Admin is disabled for now."),
      color: "#8b5cf6",
      enabled: false,
    },
  ];

  return (
    <DashboardLayout
      userEmail={me?.email ?? (loading ? "Loading…" : "Unknown")}
      userRole={userRole}
      onLogout={logout}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 16px" }}>
        {err && <div className="govError">{err}</div>}

        <div
          style={{
            marginBottom: 28,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: 38, fontWeight: 900, margin: 0 }}>
              {loading ? "Welcome" : `Welcome${me?.name ? `, ${me.name}` : ""}`}
            </h1>
            <p
              style={{
                marginTop: 10,
                marginBottom: 0,
                color: "var(--gov-muted)",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              This is your home page after login. We’ll enable cards as we add pages.
            </p>
          </div>

          <button
            className="govBtn"
            onClick={logout}
            disabled={busy === "logout"}
            style={{ height: 42 }}
          >
            <LogOut size={18} />
            <span style={{ marginLeft: 8 }}>
              {busy === "logout" ? "Logging out…" : "Logout"}
            </span>
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
            marginBottom: 44,
            opacity: loading ? 0.75 : 1,
          }}
        >
          {options.map((o, i) => (
            <div key={i} style={{ position: "relative" }}>
              <Card clickable={o.enabled} onClick={o.enabled ? o.action : undefined}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `${o.color}20`,
                      border: `1px solid ${o.color}40`,
                      display: "grid",
                      placeItems: "center",
                      color: o.color,
                    }}
                  >
                    {o.icon}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{o.title}</div>
                    {!o.enabled && <Lock size={16} style={{ opacity: 0.7 }} />}
                  </div>

                  <div style={{ fontSize: 13, color: "var(--gov-muted)", lineHeight: 1.6 }}>
                    {o.description}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        <Section title="Security Overview" description="This is still cookie-auth + DB-truth /me.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            <Card>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--gov-muted)" }}>
                  AUTH
                </div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>HttpOnly JWT Cookie</div>
                <div style={{ fontSize: 12, color: "var(--gov-muted)" }}>
                  No localStorage tokens.
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--gov-muted)" }}>
                  EMAIL
                </div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  {verified ? "Verified" : "Not verified"}
                </div>
                <div style={{ fontSize: 12, color: "var(--gov-muted)" }}>
                  From DB via /me.
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--gov-muted)" }}>
                  ROLE
                </div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{me?.role ?? "—"}</div>
                <div style={{ fontSize: 12, color: "var(--gov-muted)" }}>
                  Controlled server-side.
                </div>
              </div>
            </Card>
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}