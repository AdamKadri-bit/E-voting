// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Vote,
  Eye,
  BarChart3,
  Lock,
  UserCheck,
  Receipt,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

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

  // later:
  // kyc_verified?: boolean; // passport/national-id + face match + age checks
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

  const emailVerified = !!me?.email_verified_at || !!me?.email_verified;

  // Later we’ll flip this when backend sends kyc_verified
  // const kycVerified = !!me?.kyc_verified;

  // Badge rule you asked:
  // - yellow: email verified
  // - green: later when KYC/face match/age rules pass
  const badge = {
    label: emailVerified ? "Verified" : "Unverified",
    // yellow for email verified, gray otherwise
    color: emailVerified ? "rgba(245, 158, 11, 1)" : "rgba(148, 163, 184, 1)",
    bg: emailVerified ? "rgba(245, 158, 11, 0.16)" : "rgba(148, 163, 184, 0.12)",
    border: emailVerified
      ? "rgba(245, 158, 11, 0.35)"
      : "rgba(148, 163, 184, 0.25)",
  };

  const options = [
    {
      icon: <Vote size={28} />,
      title: "Vote in Election",
      description: "Coming next.",
      color: "#47a76f",
      enabled: false,
    },
    {
      icon: <Eye size={28} />,
      title: "Verify Your Vote",
      description: "Coming next.",
      color: "#3b82f6",
      enabled: false,
    },
    {
      icon: <BarChart3 size={28} />,
      title: "System Status",
      description: "Coming next.",
      color: "#f59e0b",
      enabled: false,
    },
  ];

  const howItWorks = [
    {
      icon: <UserCheck size={18} />,
      title: "Authenticate",
      desc: "Sign in securely. Your session is stored in an HttpOnly cookie.",
    },
    {
      icon: <Vote size={18} />,
      title: "Cast your vote",
      desc: "Choose your candidate/list and submit your encrypted ballot.",
    },
    {
      icon: <Receipt size={18} />,
      title: "Get a receipt",
      desc: "You receive a receipt hash you can keep for verification.",
    },
    {
      icon: <ShieldCheck size={18} />,
      title: "Verify",
      desc: "Use your receipt to verify your vote was included in the final tally.",
    },
  ];

  // Snapshot WITHOUT verification stat (you asked)
  const stats = [
    { label: "Active elections", value: "—", icon: <Vote size={18} /> },
    { label: "Votes cast", value: "—", icon: <TrendingUp size={18} /> },
    { label: "Role", value: me?.role ?? "—", icon: <UserCheck size={18} /> },
  ];

  return (
    <DashboardLayout
      userEmail={me?.email ?? (loading ? "Loading…" : "Unknown")}
      onLogout={logout}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 16px" }}>
        {err && <div className="govError">{err}</div>}

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 38, fontWeight: 900, margin: 0 }}>
              {loading ? "Welcome" : `Welcome${me?.name ? `, ${me.name}` : ""}`}
            </h1>

            {/* Shield badge beside user name */}
            {!loading && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: badge.bg,
                  border: `1px solid ${badge.border}`,
                  color: badge.color,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 0.2,
                }}
                title={
                  emailVerified
                    ? "Email verified"
                    : "Email not verified yet"
                }
              >
                <ShieldCheck size={14} />
                {badge.label}
              </span>
            )}
          </div>

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

          {/* No logout button here (you asked) */}
          {busy === "logout" && (
            <div style={{ marginTop: 10, color: "var(--gov-muted)", fontSize: 12 }}>
              Signing out…
            </div>
          )}
        </div>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
            marginBottom: 28,
            opacity: loading ? 0.75 : 1,
          }}
        >
          {options.map((o, i) => (
            <div key={i} style={{ position: "relative" }}>
              <Card clickable={false}>
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
                    <div style={{ fontSize: 16, fontWeight: 900 }}>
                      {o.title}
                    </div>
                    <Lock size={16} style={{ opacity: 0.7 }} />
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--gov-muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    {o.description}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Stats */}
        <Section
          title="System Snapshot"
          description="High-level signals (placeholder until backend metrics exist)."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {stats.map((s, idx) => (
              <Card key={idx}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      border: "1px solid var(--gov-edge)",
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--gov-muted)",
                        fontWeight: 800,
                      }}
                    >
                      {s.label}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>
                      {s.value}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* How it works (stacked vertically) */}
        <Section title="How it works" description="4 steps, simple and verifiable.">
          <div style={{ display: "grid", gap: 12 }}>
            {howItWorks.map((step, idx) => (
              <Card key={idx}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        border: "1px solid var(--gov-edge)",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      {step.icon}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>
                      {step.title}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--gov-muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    {step.desc}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}