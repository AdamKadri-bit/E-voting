import { useNavigate } from "react-router-dom";
import { Shield, Vote, Eye, BarChart3, Lock } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import { Card, Section } from "../components/common/Card";
import { useNotification } from "../context/NotificationContext";

export default function AuthenticatedHome() {
  const navigate = useNavigate();
  const { info } = useNotification();

  const handleLogout = () => {
    // Clear any auth state
    localStorage.removeItem("authToken");
    navigate("/landing");
  };

  const options = [
    {
      icon: <Vote size={28} />,
      title: "Vote in Election",
      description: "Cast your encrypted ballot in an active election.",
      action: () => navigate("/voter/dashboard"),
      color: "#47a76f",
    },
    {
      icon: <Eye size={28} />,
      title: "Verify Your Vote",
      description: "Check that your vote was counted correctly using your receipt hash.",
      action: () => navigate("/verify"),
      color: "#3b82f6",
    },
    {
      icon: <BarChart3 size={28} />,
      title: "System Status",
      description: "View real-time infrastructure health and security indicators.",
      action: () => navigate("/system-status"),
      color: "#f59e0b",
    },
    {
      icon: <Shield size={28} />,
      title: "Admin Dashboard",
      description: "Manage elections, audit logs, and system configuration (admin only).",
      action: () => navigate("/admin"),
      color: "#8b5cf6",
    },
    {
      icon: <Lock size={28} />,
      title: "Account Settings",
      description: "Manage your security settings and authentication methods.",
      action: () => {
        info("Settings page is coming soon. Check back later!", "Coming Soon");
      },
      color: "#ec4899",
    },
  ];

  return (
    <DashboardLayout userEmail="user@example.com" userRole="voter" onLogout={handleLogout}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 16px" }}>
        {/* Welcome Banner */}
        <div style={{ marginBottom: "60px" }}>
          <h1
            style={{
              fontSize: "42px",
              fontWeight: 800,
              margin: "0 0 12px",
              letterSpacing: 0.4,
            }}
          >
            Welcome Back
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "var(--gov-muted)",
              margin: 0,
              lineHeight: 1.8,
            }}
          >
            You are securely authenticated. Select an option below to proceed.
          </p>
        </div>

        {/* Options Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
            marginBottom: "60px",
          }}
        >
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={option.action}
              style={{
                all: "unset",
                border: "1px solid var(--gov-edge)",
                borderRadius: "16px",
                padding: "24px",
                background: "rgba(255,255,255,0.03)",
                cursor: "pointer",
                display: "grid",
                gap: "12px",
                alignContent: "start",
                transition: "all 0.2s ease",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = option.color;
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "var(--gov-edge)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: `${option.color}20`,
                  border: `1px solid ${option.color}40`,
                  display: "grid",
                  placeItems: "center",
                  color: option.color,
                }}
              >
                {option.icon}
              </div>
              <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700 }}>
                {option.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "var(--gov-muted)",
                  lineHeight: 1.6,
                }}
              >
                {option.description}
              </p>
            </button>
          ))}
        </div>

        {/* Security Info Section */}
        <Section title="Your Session is Secure" description="All communications are encrypted and authenticated.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            <Card>
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--gov-muted)" }}>
                  ENCRYPTION
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  AES-256 TLS
                </div>
                <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                  All data encrypted in transit
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--gov-muted)" }}>
                  AUTHENTICATION
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  WebAuthn Verified
                </div>
                <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                  Government-grade authentication
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--gov-muted)" }}>
                  SESSION
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  Active & Secure
                </div>
                <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                  HttpOnly secure cookies
                </div>
              </div>
            </Card>
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}
