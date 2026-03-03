import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Eye, Database, Lock, Users, TrendingUp, Vote, Landmark } from "lucide-react";
import PublicLayout from "../../components/layouts/PublicLayout";
import { Section } from "../../components/common/Card";
import { useAuth } from "../../context/AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const flash = (location.state as any)?.flash;
  const { user } = useAuth();

  // Mock elections - same as voter dashboard
  const elections = [
    {
      id: "1",
      title: "Presidential Election 2026",
      status: "open" as const,
      startTime: new Date(Date.now() - 7200000),
      endTime: new Date(Date.now() + 604800000),
      totalCandidates: 5,
    },
    {
      id: "2",
      title: "Board of Directors 2026",
      status: "closed" as const,
      startTime: new Date(Date.now() - 2592000000),
      endTime: new Date(Date.now() - 1209600000),
      totalCandidates: 8,
    },
    {
      id: "3",
      title: "Local Council Elections",
      status: "upcoming" as const,
      startTime: new Date(Date.now() + 2592000000),
      endTime: new Date(Date.now() + 3196800000),
      totalCandidates: 12,
    },
  ];

  const activeElections = elections.filter((e) => e.status === "open");

  const features = [
    {
      icon: <Lock size={20} />,
      title: "WebAuthn Authentication",
      description: "Passwordless secure authentication using hardware keys and biometrics.",
    },
    {
      icon: <Shield size={20} />,
      title: "End-to-End Encryption",
      description: "All votes encrypted client-side. No third party can read your ballot.",
    },
    {
      icon: <Users size={20} />,
      title: "Anonymous Ballots",
      description: "Decoupled identity from vote. Complete anonymity guaranteed.",
    },
    {
      icon: <Database size={20} />,
      title: "Immutable Audit Logs",
      description: "Tamper-proof record of every action. Full transparency via public blockchain.",
    },
    {
      icon: <Landmark size={20} />,
      title: "Scalable Infrastructure",
      description:
        "From university elections to national government. Built for millions of voters.",
    },
  ];

  const steps = [
    {
      number: "1",
      title: "Authenticate Securely",
      description: "Verify your identity through government registry and WebAuthn.",
    },
    {
      number: "2",
      title: "Cast Encrypted Ballot",
      description: "Select your choice. Encryption happens client-side before submission.",
    },
    {
      number: "3",
      title: "Receive Receipt Hash",
      description: "Get a unique receipt hash to verify your vote was counted correctly.",
    },
    {
      number: "4",
      title: "Public Verification",
      description: "Audit logs prove electoral integrity. Anyone can verify the election.",
    },
  ];

  const stats = [
    { label: "Active Elections", value: "12", icon: <Vote size={18} /> },
    { label: "Votes Cast", value: "1.2M", icon: <TrendingUp size={18} /> },
    { label: "System Uptime", value: "99.98%", icon: <Shield size={18} /> },
    { label: "Last Audit", value: "2 hours ago", icon: <Eye size={18} /> },
  ];

  return (
    <PublicLayout>
      {flash && (
        <div
          style={{
            background: "rgba(71,167,111,0.15)",
            border: "1px solid rgba(71,167,111,0.3)",
            borderRadius: "8px",
            padding: "12px 16px",
            margin: "20px 40px 0",
            color: "#47a76f",
            fontSize: "14px",
          }}
        >
          {flash}
        </div>
      )}
      <div className="govHero">
        <div className="govHeroInner">
          {/* Hero Text */}
          <div style={{ textAlign: "center", maxWidth: "700px" }}>
            <h1
              style={{
                fontSize: "48px",
                fontWeight: 800,
                margin: "0 0 20px",
                letterSpacing: 0.4,
                lineHeight: 1.2,
              }}
            >
              Secure. Transparent. Verifiable.
            </h1>
            <p
              style={{
                fontSize: "16px",
                color: "var(--gov-muted)",
                margin: "0 0 32px",
                lineHeight: 1.8,
                maxWidth: "600px",
              }}
            >
              Enterprise-grade e-voting platform designed for government-scale elections.
              End-to-end encrypted ballots. Immutable audit logs. Complete transparency.
            </p>

            {/* CTAs */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button 
                type="button"
                className="govBtn" 
                onClick={() => navigate(user ? "/dashboard" : "/login")}
                style={{ padding: "14px 24px", fontWeight: 600, cursor: "pointer" }}
              >
                {user ? "Go to Dashboard" : "Sign In to Begin"}
              </button>
              <button 
                type="button"
                className="govBtn" 
                onClick={() => navigate("/verify")}
                style={{ padding: "14px 24px", fontWeight: 600, cursor: "pointer" }}
              >
                Verify Vote
              </button>
              <button 
                type="button"
                className="govBtn" 
                onClick={() => navigate("/system-status")}
                style={{ padding: "14px 24px", fontWeight: 600, cursor: "pointer" }}
              >
                View Status
              </button>
            </div>
          </div>

          {/* Security Pillars */}
          <div className="govPillBand">
            <div className="govPillGrid">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  style={{
                    border: "1px solid var(--gov-edge)",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "rgba(255,255,255,0.03)",
                    minHeight: "122px",
                    display: "grid",
                    gap: "8px",
                    alignContent: "start",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "12px",
                        border: "1px solid var(--gov-edge)",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(201,162,39,0.08)",
                        color: "var(--gov-gold)",
                      }}
                    >
                      {feature.icon}
                    </div>
                    <div style={{ fontWeight: 900, letterSpacing: 0.2, fontSize: "13.5px" }}>
                      {feature.title}
                    </div>
                  </div>
                  <div style={{ color: "var(--gov-muted)", fontSize: "13px", lineHeight: 1.55 }}>
                    {feature.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Elections Section */}
      {activeElections.length > 0 && (
        <Section
          title="Active Elections"
          description="Participate in ongoing elections now."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {activeElections.map((election) => (
              <button
                key={election.id}
                type="button"
                onClick={() => navigate(user ? "/voter/dashboard" : "/login")}
                style={{
                  all: "unset",
                  border: "1px solid rgba(71,167,111,0.3)",
                  borderRadius: "16px",
                  padding: "24px",
                  background: "rgba(71,167,111,0.05)",
                  cursor: "pointer",
                  display: "grid",
                  gap: "12px",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(71,167,111,0.12)";
                  e.currentTarget.style.borderColor = "rgba(71,167,111,0.6)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(71,167,111,0.05)";
                  e.currentTarget.style.borderColor = "rgba(71,167,111,0.3)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#47a76f" }}>
                  {election.title}
                </h3>
                <div style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
                  <div style={{ color: "var(--gov-muted)" }}>
                    {election.totalCandidates} candidates
                  </div>
                  <div style={{ color: "var(--gov-muted)" }}>•</div>
                  <div style={{ color: "#47a76f", fontWeight: 600 }}>
                    Open Now
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--gov-muted)", lineHeight: 1.5 }}>
                  Cast your encrypted ballot securely. Your vote is completely anonymous.
                </p>
                <div style={{ marginTop: "12px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "rgba(71,167,111,0.15)",
                      color: "#47a76f",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {user ? "Vote Now" : "Sign in to Vote"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Sections */}
      <div className="govSections">
        {/* How It Works */}
        <Section
          title="How It Works"
          description="Simple, secure voting in 4 steps."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {steps.map((step, idx) => (
              <div key={idx}>
                <div
                  style={{
                    border: "1px solid var(--gov-edge)",
                    borderRadius: "16px",
                    padding: "24px",
                    background: "rgba(255,255,255,0.03)",
                    display: "grid",
                    gap: "12px",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "rgba(201,162,39,0.2)",
                      border: "1px solid rgba(201,162,39,0.4)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                      fontSize: "16px",
                      color: "var(--gov-gold)",
                    }}
                  >
                    {step.number}
                  </div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                    {step.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "var(--gov-muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Transparency Metrics */}
        <Section
          title="System Transparency"
          description="Real-time monitoring of electoral integrity."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {stats.map((stat, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--gov-edge)",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "rgba(255,255,255,0.03)",
                  display: "grid",
                  gap: "12px",
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    border: "1px solid var(--gov-edge)",
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(201,162,39,0.08)",
                    color: "var(--gov-gold)",
                  }}
                >
                  {stat.icon}
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "var(--gov-muted)", marginBottom: "4px" }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 700 }}>
                    {stat.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Public Verification */}
        <Section
          title="Verify Your Vote"
          description="Check that your vote was counted correctly using your receipt hash."
        >
          <div
            style={{
              border: "1px solid var(--gov-edge)",
              borderRadius: "18px",
              padding: "40px",
              background: "rgba(255,255,255,0.03)",
              textAlign: "center",
              display: "grid",
              gap: "20px",
            }}
          >
            <p style={{ fontSize: "14px", color: "var(--gov-muted)", margin: 0 }}>
              Enter your vote receipt hash below to verify your ballot was counted in the election.
            </p>
            <div style={{ display: "flex", gap: "12px", maxWidth: "500px", margin: "0 auto" }}>
              <input
                type="text"
                className="govInput"
                placeholder="Paste your receipt hash..."
                style={{ flex: 1 }}
              />
              <button 
                type="button"
                className="govBtn govBtnPrimary" 
                onClick={() => navigate("/verify")}
                style={{ padding: "11px 16px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Verify
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "var(--gov-muted)", margin: 0 }}>
              No personal information is required. Your vote hash is anonymous.
            </p>
          </div>
        </Section>

        {/* Trust Banner */}
        <div
          style={{
            border: "1px solid rgba(201,162,39,0.3)",
            borderRadius: "18px",
            padding: "40px",
            background: "rgba(201,162,39,0.08)",
            textAlign: "center",
            display: "grid",
            gap: "16px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
            Built for Trust
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "var(--gov-muted)",
              maxWidth: "600px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            EVOTE meets government-grade security standards. Every transaction is auditable.
            Every vote is encrypted. Complete transparency. Zero trust in any single party.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
