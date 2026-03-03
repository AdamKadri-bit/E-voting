import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, CheckCircle, AlertCircle, Shield, Vote } from "lucide-react";

const API_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

interface User {
  sub: number;           // user ID from JWT
  email: string;
  role: string;
  email_verified: boolean;  // boolean from JWT, not a date
  iat?: number;
  exp?: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    console.log("💾 Dashboard component mounted");
    fetchUserData();
  }, []);

  async function fetchUserData() {
    try {
      console.log("📡 Fetching user data from:", API_URL + "/me");
      const res = await fetch(`${API_URL}/me`, {
        headers: { "Accept": "application/json" },
        credentials: "include",
      });

      console.log("📬 Response status:", res.status, "ok:", res.ok);

      if (!res.ok) {
        if (res.status === 401) {
          console.log("❌ Got 401 Unauthorized, navigating to /login");
          navigate("/login");
          return;
        }
        throw new Error(`HTTP ${res.status}: Failed to fetch user data`);
      }

      const data = await res.json();
      console.log("✅ User data received:", data.user);
      setUser(data.user);
    } catch (err: any) {
      console.error("❌ Error:", err);
      setError(err.message || "Error loading user data");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerificationEmail() {
    if (!user) return;
    setIsResending(true);
    setResendMessage(null);

    try {
      const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();
      if (res.ok) {
        setResendMessage("Verification email sent. Check your inbox (and spam folder).");
      } else {
        setResendMessage(data.message || "Failed to resend verification email");
      }
    } catch (err: any) {
      setResendMessage("Error sending verification email");
    } finally {
      setIsResending(false);
    }
  }

  function handleLogout() {
    // Clear auth and redirect
    navigate("/login");
  }

  function goToAdmin() {
    navigate("/admin");
  }

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "inherit" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "inherit" }}>
        <p style={{ color: "#ff6b6b" }}>{error || "User data not found"}</p>
        <button
          onClick={() => navigate("/login")}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            background: "rgba(201,162,39,0.62)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            color: "white",
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "inherit", minHeight: "100vh", background: "var(--gov-bg)" }}>
      {/* Header */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          borderBottom: "1px solid rgba(201,162,39,0.2)",
          padding: "24px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>E-Voting Portal</h1>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 700, margin: "0 0 8px" }}>
            Welcome, {user.email}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.66)", margin: 0 }}>
            Manage your voting account and cast your vote
          </p>
        </div>

        {/* User Info Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(201,162,39,0.2)",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700 }}>
            Account Information
          </h3>
          <div style={{ display: "grid", gap: "16px" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                User ID
              </p>
              <p style={{ margin: 0, fontSize: "14px" }}>{user.sub}</p>
            </div>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                Email
              </p>
              <p style={{ margin: 0, fontSize: "14px" }}>{user.email}</p>
            </div>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                Role
              </p>
              <p style={{ margin: 0, fontSize: "14px", textTransform: "capitalize" }}>
                {user.role}
              </p>
            </div>
          </div>
        </div>

        {/* Email Verification Status */}
        <div
          style={{
            background: user.email_verified
              ? "rgba(71,167,111,0.1)"
              : "rgba(255,107,107,0.1)",
            border: `1px solid ${user.email_verified ? "rgba(71,167,111,0.3)" : "rgba(255,107,107,0.3)"}`,
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "16px",
          }}
        >
          <div style={{ marginTop: "2px" }}>
            {user.email_verified ? (
              <CheckCircle size={24} style={{ color: "#47a76f" }} />
            ) : (
              <AlertCircle size={24} style={{ color: "#ff6b6b" }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700 }}>
              Email Verification
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>
              {user.email_verified
                ? "Your email is verified. You can now vote in elections."
                : "Your email is not verified. Verify your email to start voting."}
            </p>
            {!user.email_verified && (
              <button
                onClick={resendVerificationEmail}
                disabled={isResending}
                style={{
                  padding: "8px 16px",
                  background: "rgba(255,107,107,0.2)",
                  border: "1px solid rgba(255,107,107,0.4)",
                  borderRadius: "6px",
                  color: "white",
                  cursor: isResending ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {isResending ? "Sending..." : "Resend Verification Email"}
              </button>
            )}
            {resendMessage && (
              <p
                style={{
                  marginTop: "12px",
                  fontSize: "13px",
                  color: resendMessage.includes("sent") ? "#47a76f" : "#ff9f43",
                }}
              >
                {resendMessage}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "grid", gap: "12px" }}>
          {/* Voting Option */}
          {user.email_verified && (
            <button
              onClick={() => navigate("/elections")}
              style={{
                all: "unset",
                padding: "24px",
                background: "rgba(71,167,111,0.15)",
                border: "1px solid rgba(71,167,111,0.3)",
                borderRadius: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = "rgba(71,167,111,0.25)";
                el.style.borderColor = "rgba(71,167,111,0.5)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "rgba(71,167,111,0.15)";
                el.style.borderColor = "rgba(71,167,111,0.3)";
              }}
            >
              <Vote size={24} style={{ color: "#47a76f" }} />
              <div style={{ textAlign: "left" }}>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Browse Elections</h4>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                  Participate in active elections
                </p>
              </div>
            </button>
          )}

          {/* Admin Option */}
          {user.role === "admin" && (
            <button
              onClick={goToAdmin}
              style={{
                all: "unset",
                padding: "24px",
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.3)",
                borderRadius: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = "rgba(139,92,246,0.25)";
                el.style.borderColor = "rgba(139,92,246,0.5)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "rgba(139,92,246,0.15)";
                el.style.borderColor = "rgba(139,92,246,0.3)";
              }}
            >
              <Shield size={24} style={{ color: "#8b5cf6" }} />
              <div style={{ textAlign: "left" }}>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Admin Dashboard</h4>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                  Manage elections and system
                </p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
