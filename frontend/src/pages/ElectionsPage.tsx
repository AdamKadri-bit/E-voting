import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Vote, CalendarDays, ShieldCheck, ChevronRight } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import { Card, Section } from "../components/common/Card";

const ACTIVE_ELECTION_ID =
  Number(import.meta.env.VITE_ACTIVE_ELECTION_ID) || 1;

export default function ElectionsPage() {
  const nav = useNavigate();

  const election = useMemo(
    () => ({
      id: ACTIVE_ELECTION_ID,
      title: "Parliamentary Election",
      subtitle: "Active election",
      description:
        "Cast your ballot through a secure guided flow and keep your receipt for later verification.",
      status: "Open",
      district: "Lebanon",
    }),
    []
  );

  return (
    <DashboardLayout userEmail={undefined}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(71, 167, 111, 0.14)",
              border: "1px solid rgba(71, 167, 111, 0.28)",
              color: "#47a76f",
              fontSize: 12,
              fontWeight: 900,
              marginBottom: 14,
            }}
          >
            <ShieldCheck size={14} />
            Active election
          </div>

          <h1
            style={{
              fontSize: 40,
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.08,
            }}
          >
            Elections
          </h1>

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
            Open the current election and proceed to the ballot. Once submitted,
            you will receive a receipt hash you can later verify.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <Card clickable>
            <div
              onClick={() => nav(`/elections/${election.id}/ballot`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  nav(`/elections/${election.id}/ballot`);
                }
              }}
              style={{
                display: "grid",
                gap: 18,
                cursor: "pointer",
                minHeight: 250,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: "rgba(71, 167, 111, 0.18)",
                    border: "1px solid rgba(71, 167, 111, 0.34)",
                    display: "grid",
                    placeItems: "center",
                    color: "#47a76f",
                    boxShadow: "0 8px 30px rgba(71, 167, 111, 0.12)",
                  }}
                >
                  <Vote size={30} />
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
                  }}
                >
                  Primary action
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    lineHeight: 1.12,
                    letterSpacing: -0.2,
                  }}
                >
                  {election.title}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(71, 167, 111, 0.12)",
                      border: "1px solid rgba(71, 167, 111, 0.26)",
                      color: "#47a76f",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {election.status}
                  </span>

                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--gov-edge)",
                      color: "var(--gov-muted)",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {election.district}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 14,
                    color: "var(--gov-muted)",
                    lineHeight: 1.75,
                    maxWidth: 560,
                  }}
                >
                  {election.description}
                </div>
              </div>

              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 16px",
                    borderRadius: 14,
                    background: "rgba(71, 167, 111, 0.16)",
                    border: "1px solid rgba(71, 167, 111, 0.34)",
                    color: "#47a76f",
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  Open ballot
                  <ChevronRight size={16} />
                </div>

                <ChevronRight size={18} style={{ opacity: 0.8 }} />
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display: "grid", gap: 16, minHeight: 250 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  border: "1px solid var(--gov-edge)",
                  background: "rgba(255,255,255,0.04)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--gov-muted)",
                }}
              >
                <CalendarDays size={24} />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>
                  Before you proceed
                </div>

                <div
                  style={{
                    fontSize: 14,
                    color: "var(--gov-muted)",
                    lineHeight: 1.7,
                  }}
                >
                  Review your selections carefully before submitting. Once your
                  ballot is cast, keep the receipt hash so you can verify your
                  inclusion later.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginTop: "auto",
                }}
              >
                {[
                  "Open the ballot",
                  "Choose a list and optional candidate",
                  "Submit your vote",
                  "Save your receipt",
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "24px 1fr",
                      gap: 10,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        border: "1px solid var(--gov-edge)",
                        background: "rgba(255,255,255,0.04)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 900,
                        color: "var(--gov-muted)",
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--gov-muted)",
                        lineHeight: 1.6,
                        paddingTop: 2,
                      }}
                    >
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <Section
          title="Available now"
          description="Only the active election is opened in this phase."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <Card>
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--gov-muted)",
                    fontWeight: 800,
                  }}
                >
                  Election status
                </div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>Open</div>
              </div>
            </Card>

            <Card>
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--gov-muted)",
                    fontWeight: 800,
                  }}
                >
                  Active election id
                </div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>
                  {election.id}
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--gov-muted)",
                    fontWeight: 800,
                  }}
                >
                  Verification
                </div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>
                  Receipt-based
                </div>
              </div>
            </Card>
          </div>
        </Section>
      </div>

      <style>{`
        @media (max-width: 960px) {
          div[style*="grid-template-columns: 1.6fr 1fr"] {
            grid-template-columns: 1fr !important;
          }

          div[style*="repeat(3, minmax(0, 1fr))"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}