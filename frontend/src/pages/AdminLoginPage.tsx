import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ChevronLeft } from "lucide-react";
import GovShell from "../ui/GovShell";

const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "admin123"
};

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if already logged in as admin
  useEffect(() => {
    const adminToken = localStorage.getItem("adminToken");
    if (adminToken) {
      navigate("/admin");
    }
  }, [navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        // Mock successful login - store admin token
        localStorage.setItem("adminToken", "mock-admin-token-" + Date.now());
        localStorage.setItem("adminUser", username);
        navigate("/admin");
      } else {
        setError("Invalid username or password. Please try again.");
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <GovShell
      title="Admin Access"
      subtitle="Enter your credentials to access the election administration portal."
      right={
        <>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              all: "unset",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "24px",
              fontSize: "13px",
              color: "var(--gov-gold)",
              cursor: "pointer",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            <ChevronLeft size={16} />
            Back to Home
          </button>

          <form className="govForm" onSubmit={handleAdminLogin}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px",
                borderRadius: "12px",
                background: "rgba(201,162,39,0.1)",
                border: "1px solid rgba(201,162,39,0.3)",
                marginBottom: "24px",
              }}
            >
              <Shield size={24} color="var(--gov-gold)" strokeWidth={1.5} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>Restricted Access</div>
                <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                  Admin credentials required. This access is logged and audited.
                </div>
              </div>
            </div>

            <label className="govLabel">
              <span>Username</span>
              <input
                className="govInput"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={isLoading}
              />
            </label>

            <label className="govLabel">
              <span>Password</span>
              <input
                className="govInput"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </label>

            {error && <div className="govError">{error}</div>}

            <button className="govBtn govBtnPrimary" disabled={isLoading} type="submit">
              {isLoading ? "Authenticating..." : "Access Admin Portal"}
            </button>
          </form>

          <div
            style={{
              fontSize: "11px",
              color: "var(--gov-muted)",
              marginTop: "20px",
              padding: "12px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.03)",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, letterSpacing: 0.3 }}>
              TEST CREDENTIALS: admin / admin123
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "10px" }}>
              (Remove in production. Use proper OAuth/SAML)
            </p>
          </div>
        </>
      }
    />
  );
}
