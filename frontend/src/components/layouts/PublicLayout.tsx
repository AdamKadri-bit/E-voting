import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useGovTheme } from "../../ui/useGovTheme";
import { Sun, Moon, Lock, Home, Shield, ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { theme, toggle } = useGovTheme();
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="govPage">
      {/* Fixed Top Bar */}
      <div className="govTopBar">
        <div className="govTopBarLeft">
          <div className="govSealBox">
            <Lock size={24} strokeWidth={1.5} />
          </div>
          <div>
            <div className="govBrandTitle">EVOTE</div>
            <div className="govBrandSub">Enterprise Voting</div>
          </div>
        </div>

        <div className="govTopBarRight" style={{ gap: "8px" }}>
          {user ? (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="govBtn"
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                {user.email}
                <ChevronDown size={16} />
              </button>
              {showDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    background: "var(--gov-card)",
                    border: "1px solid var(--gov-edge)",
                    borderRadius: "12px",
                    zIndex: 100,
                    minWidth: "180px",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/dashboard");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      border: "none",
                      background: "none",
                      color: "var(--gov-ink)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "13px",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <Shield size={16} />
                    My Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setShowDropdown(false);
                      await logout();
                      navigate("/");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      border: "none",
                      background: "none",
                      color: "var(--gov-ink)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "13px",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="govBtn"
              onClick={() => navigate("/login")}
              title="Sign in"
              style={{ padding: "10px 16px", fontSize: "14px" }}
            >
              Sign In
            </button>
          )}
          <button
            type="button"
            className="govBtn"
            onClick={() => navigate("/admin-login")}
            title="Admin access"
            style={{ padding: "10px 12px" }}
          >
            <Shield size={18} />
          </button>
          <button
            type="button"
            className="govBtn"
            onClick={() => navigate("/")}
            title="Go to home"
            style={{ padding: "10px 12px" }}
          >
            <Home size={18} />
          </button>
          <button
            type="button"
            className="govBtn"
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            style={{ padding: "10px 12px" }}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="govMain">
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--gov-edge)",
          padding: "40px 16px",
          marginTop: "80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "40px",
            marginBottom: "40px",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600 }}>
              Product
            </h4>
            <nav style={{ display: "grid", gap: "8px", fontSize: "13px" }}>
              <a href="#features">Features</a>
              <a href="#security">Security</a>
              <a href="#transparency">Transparency</a>
            </nav>
          </div>

          <div style={{ textAlign: "left" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600 }}>
              Organization
            </h4>
            <nav style={{ display: "grid", gap: "8px", fontSize: "13px" }}>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
              <a href="#careers">Careers</a>
            </nav>
          </div>

          <div style={{ textAlign: "left" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600 }}>
              Legal
            </h4>
            <nav style={{ display: "grid", gap: "8px", fontSize: "13px" }}>
              <a href="#whitepaper">Security Whitepaper</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
            </nav>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--gov-edge)",
            paddingTop: "20px",
            fontSize: "12px",
            color: "var(--gov-muted)",
          }}
        >
          <p style={{ margin: 0 }}>
            &copy; 2026 E-Voting Platform. Government-grade secure voting.
          </p>
        </div>
      </footer>
    </div>
  );
}
