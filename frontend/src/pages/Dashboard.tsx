// src/pages/Dashboard.tsx
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Vote,
  Eye,
  BarChart3,
  Lock,
  ChevronRight,
  UserCheck,
  Receipt,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

import DashboardLayout from "../components/layouts/DashboardLayout";
import { Card, Section } from "../components/common/Card";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

type RegistryPerson = {
  id?: number | string;
  full_name_en?: string | null;
  full_name_ar?: string | null;
  district?: string | null;
  locality?: string | null;
  constituency_id?: number | null;
  is_eligible?: boolean;
  has_voted?: boolean;
};

type DbUser = {
  id?: number | string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  email_verified_at?: string | null;
  email_verified?: boolean;
  registry_person_id?: number | string | null;
  verification_status?: string | null;
  can_vote?: boolean;
  registry_person?: RegistryPerson | null;
};

type MeResponse = {
  ok?: boolean;
  user?: DbUser;
  message?: string;
  error?: string;
};

type DashboardOption = {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
  enabled: boolean;
  to?: string;
  cta?: string;
  featured?: boolean;
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
  const registryLinked = !!me?.registry_person_id;
  const canVote = !!me?.can_vote;
  const hasVoted = !!me?.registry_person?.has_voted;

  const badge = {
    label: emailVerified ? "Verified" : "Unverified",
    color: emailVerified ? "rgba(245, 158, 11, 1)" : "rgba(148, 163, 184, 1)",
    bg: emailVerified
      ? "rgba(245, 158, 11, 0.16)"
      : "rgba(148, 163, 184, 0.12)",
    border: emailVerified
      ? "rgba(245, 158, 11, 0.35)"
      : "rgba(148, 163, 184, 0.25)",
  };

  const options: DashboardOption[] = registryLinked
    ? [
        {
          icon: <Vote size={30} />,
          title: hasVoted ? "Vote Recorded" : "Vote in Election",
          description: hasVoted
            ? "This voter record is already marked as having voted."
            : canVote
            ? "Open the active election and cast your ballot through a secure guided flow."
            : "Voting is currently locked for this account.",
          color: "#47a76f",
          enabled: !hasVoted && canVote,
          to: !hasVoted && canVote ? "/elections" : undefined,
          cta: hasVoted ? "Already voted" : canVote ? "Cast ballot" : "Locked",
          featured: true,
        },
        {
          icon: <Eye size={30} />,
          title: "Verify Your Vote",
          description: hasVoted
            ? "Use your receipt hash to confirm your vote was included in the final tally."
            : "Verification becomes useful after a vote has been recorded.",
          color: "#3b82f6",
          enabled: hasVoted,
          to: hasVoted ? "/verify" : undefined,
          cta: hasVoted ? "Verify receipt" : "Unavailable",
        },
        {
          icon: <BarChart3 size={28} />,
          title: "System Status",
          description:
            "Operational metrics and audit signals will appear here in a later phase.",
          color: "#f59e0b",
          enabled: false,
        },
      ]
    : [
        {
          icon: <UserCheck size={30} />,
          title: "Verify Voter Record",
          description:
            "Match this platform account to a voter registry record before voting is unlocked.",
          color: "#3b82f6",
          enabled: true,
          to: "/verify-voter",
          cta: "Start verification",
          featured: true,
        },
        {
          icon: <Vote size={30} />,
          title: "Vote in Election",
          description: "Locked until your voter registry record is verified.",
          color: "#47a76f",
          enabled: false,
          cta: "Locked",
        },
        {
          icon: <BarChart3 size={28} />,
          title: "System Status",
          description:
            "Operational metrics and audit signals will appear here in a later phase.",
          color: "#f59e0b",
          enabled: false,
        },
      ];

  const howItWorks = registryLinked
    ? [
        {
          icon: <UserCheck size={18} />,
          title: "Authenticated",
          desc: "Your account is signed in and linked to a voter registry record.",
        },
        {
          icon: <Vote size={18} />,
          title: "Cast your vote",
          desc: "Choose your candidate/list and submit your encrypted ballot.",
        },
        {
          icon: <Receipt size={18} />,
          title: "Get a receipt",
          desc: "You receive a receipt hash you can keep for later verification.",
        },
        {
          icon: <ShieldCheck size={18} />,
          title: "Verify",
          desc: "Use your receipt to confirm inclusion in the final tally.",
        },
      ]
    : [
        {
          icon: <UserCheck size={18} />,
          title: "Authenticate",
          desc: "Sign in securely. Your session is stored in an HttpOnly cookie.",
        },
        {
          icon: <ShieldCheck size={18} />,
          title: "Verify voter record",
          desc: "Match your platform account to a voter registry record.",
        },
        {
          icon: <Vote size={18} />,
          title: "Unlock voting",
          desc: "Once linked, the correct constituency ballot can be opened.",
        },
        {
          icon: <Receipt size={18} />,
          title: "Cast and verify",
          desc: "Vote securely, receive a receipt, and verify inclusion later.",
        },
      ];

  const stats = registryLinked
    ? [
        {
          label: "Account status",
          value: "Linked",
          icon: <UserCheck size={18} />,
        },
        {
          label: "Voting access",
          value: canVote ? "Unlocked" : "Locked",
          icon: <Vote size={18} />,
        },
        {
          label: "Role",
          value: me?.role ?? "—",
          icon: <TrendingUp size={18} />,
        },
      ]
    : [
        {
          label: "Account status",
          value: "Pending verification",
          icon: <UserCheck size={18} />,
        },
        {
          label: "Voting access",
          value: "Locked",
          icon: <Vote size={18} />,
        },
        {
          label: "Role",
          value: me?.role ?? "—",
          icon: <TrendingUp size={18} />,
        },
      ];

  function handleOptionClick(option: DashboardOption) {
    if (!option.enabled || !option.to) return;
    nav(option.to);
  }

  return (
    <DashboardLayout
      userEmail={me?.email ?? (loading ? "Loading…" : "Unknown")}
      onLogout={logout}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 16px" }}>
        {err && <div className="govError">{err}</div>}

        <div style={{ marginBottom: 30 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{
                fontSize: 42,
                fontWeight: 900,
                margin: 0,
                lineHeight: 1.05,
              }}
            >
              {loading ? "Welcome" : `Welcome${me?.name ? `, ${me.name}` : ""}`}
            </h1>

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
                title={emailVerified ? "Email verified" : "Email not verified yet"}
              >
                <ShieldCheck size={14} />
                {badge.label}
              </span>
            )}
          </div>

          <p
            style={{
              marginTop: 12,
              marginBottom: 0,
              color: "var(--gov-muted)",
              fontSize: 15,
              lineHeight: 1.75,
              maxWidth: 760,
            }}
          >
            {registryLinked
              ? "Secure voting actions are available below. Start with the active election, then keep your receipt to verify inclusion afterward."
              : "Your platform account is active, but voting remains locked until your voter record is verified."}
          </p>

          {busy === "logout" && (
            <div
              style={{
                marginTop: 10,
                color: "var(--gov-muted)",
                fontSize: 12,
              }}
            >
              Signing out…
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(13, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 18,
            opacity: loading ? 0.75 : 1,
          }}
        >
          {options.slice(0, 2).map((o, i) => {
            const isInteractive = o.enabled && !!o.to;
            const columnSpan = i === 0 ? "span 8" : "span 5";

            return (
              <div
                key={i}
                style={{
                  gridColumn: columnSpan,
                  minWidth: 0,
                }}
              >
                <div
                  onClick={() => handleOptionClick(o)}
                  role={isInteractive ? "button" : undefined}
                  tabIndex={isInteractive ? 0 : -1}
                  onKeyDown={(e) => {
                    if (!isInteractive) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOptionClick(o);
                    }
                  }}
                  style={{
                    cursor: isInteractive ? "pointer" : "default",
                    height: "100%",
                  }}
                >
                  <Card clickable={isInteractive}>
                    <div
                      style={{
                        display: "grid",
                        gap: 16,
                        minHeight: 220,
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: o.featured ? 54 : 48,
                            height: o.featured ? 54 : 48,
                            borderRadius: 14,
                            background: `${o.color}20`,
                            border: `1px solid ${o.color}40`,
                            display: "grid",
                            placeItems: "center",
                            color: o.color,
                            boxShadow: o.featured
                              ? `0 0 0 1px ${o.color}15 inset, 0 8px 30px ${o.color}12`
                              : undefined,
                            flexShrink: 0,
                          }}
                        >
                          {o.icon}
                        </div>

                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid var(--gov-edge)",
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--gov-muted)",
                            fontSize: 12,
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {o.featured ? "Primary action" : "Secondary action"}
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        <div
                          style={{
                            fontSize: o.featured ? 26 : 21,
                            fontWeight: 900,
                            lineHeight: 1.15,
                            letterSpacing: -0.2,
                          }}
                        >
                          {o.title}
                        </div>

                        <div
                          style={{
                            fontSize: 14,
                            color: "var(--gov-muted)",
                            lineHeight: 1.7,
                            maxWidth: o.featured ? 520 : 420,
                          }}
                        >
                          {o.description}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                            padding: o.featured ? "12px 16px" : "10px 14px",
                            borderRadius: 14,
                            background: o.featured
                              ? `${o.color}18`
                              : "rgba(255,255,255,0.05)",
                            border: `1px solid ${
                              o.featured ? `${o.color}45` : "var(--gov-edge)"
                            }`,
                            color: o.featured ? o.color : "var(--gov-text)",
                            fontWeight: 900,
                            fontSize: 14,
                          }}
                        >
                          {o.cta}
                          <ArrowRight size={16} />
                        </div>

                        <ChevronRight
                          size={18}
                          style={{
                            opacity: 0.8,
                            flexShrink: 0,
                          }}
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: 28 }}>
          {(() => {
            const o = options[2];
            const isInteractive = o.enabled && !!o.to;

            return (
              <div
                onClick={() => handleOptionClick(o)}
                role={isInteractive ? "button" : undefined}
                tabIndex={isInteractive ? 0 : -1}
                style={{
                  cursor: isInteractive ? "pointer" : "default",
                }}
              >
                <Card clickable={isInteractive}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
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

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          marginBottom: 4,
                        }}
                      >
                        {o.title}
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

                    {isInteractive ? (
                      <ChevronRight size={17} style={{ opacity: 0.8 }} />
                    ) : (
                      <Lock size={16} style={{ opacity: 0.7 }} />
                    )}
                  </div>
                </Card>
              </div>
            );
          })()}
        </div>

        <Section
          title="System Snapshot"
          description="High-level signals (placeholder until backend metrics exist)."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {stats.map((s, idx) => (
              <Card key={idx}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      border: "1px solid var(--gov-edge)",
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(255,255,255,0.03)",
                      flexShrink: 0,
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

        <Section
          title="How it works"
          description="A short, verifiable path from authentication to vote confirmation."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
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
                        flexShrink: 0,
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

      <style>{`
        @media (max-width: 980px) {
          .govError {
            margin-bottom: 16px;
          }
        }

        @media (max-width: 960px) {
          div[style*="repeat(13, minmax(0, 1fr))"] {
            grid-template-columns: 1fr !important;
          }

          div[style*="span 8"],
          div[style*="span 5"] {
            grid-column: auto !important;
          }

          div[style*="repeat(3, minmax(0, 1fr))"] {
            grid-template-columns: 1fr !important;
          }

          div[style*="repeat(2, minmax(0, 1fr))"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}