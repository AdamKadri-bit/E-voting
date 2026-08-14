import type { ReactNode } from "react";
import { useGovTheme } from "../../ui/useGovTheme";
import { Sun, Moon, TreePine, LogOut, ChevronDown, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout as apiLogout } from "../../lib/api";
import BackButton from "../common/BackButton";

type DashboardLayoutProps = {
  userEmail?: string;
  userRole?: "voter" | "admin";
  onLogout?: () => void;
  /** When true, the top bar shows Sign in / Sign up instead of the user menu. */
  isGuest?: boolean;
  children: ReactNode;
};

export default function DashboardLayout({
  userEmail = "user@example.com",
  onLogout,
  isGuest = false,
  children,
}: DashboardLayoutProps) {
  const { theme, toggle } = useGovTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Pages that do not manage their own session state still need a working
  // Sign out, so fall back to ending the session here rather than no-opping.
  async function defaultLogout() {
    try {
      await apiLogout();
    } catch {
      // Network failure still clears the client-side session below.
    } finally {
      navigate("/login", { replace: true });
    }
  }

  const handleLogout = onLogout ?? defaultLogout;

  // The dashboard is the home page, so it never shows a Back button.
  const showBack = location.pathname !== "/dashboard";

  return (
    <div className="govPage">
      {/* Fixed Top Bar */}
      <div className="govTopBar">
        <div className="govTopBarLeft">
          <div className="govSealBox" aria-hidden>
            <TreePine size={22} />
          </div>

          <div>
            <div className="govBrandTitle" style={{ lineHeight: 1.1 }}>
              Lebanon Secure E-Voting
            </div>
            <div className="govBrandSub">
              Official portal prototype • Integrity-first
              <span style={{ marginLeft: 10, opacity: 0.85 }}>
                بوابة اقتراع آمنة
              </span>
            </div>
          </div>
        </div>

        <div className="govTopBarRight" style={{ gap: "16px" }}>
          {isGuest ? (
            <>
              {/* Guest actions */}
              <Link
                to="/login"
                className="govBtn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                <LogIn size={16} />
                Sign in
              </Link>
              <Link
                to="/signup"
                className="govBtn govBtnGold"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                <UserPlus size={16} />
                Sign up
              </Link>
            </>
          ) : (
            /* User Profile Dropdown */
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="govBtn"
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                }}
              >
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                    {userEmail}
                  </div>
                </div>
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
                    minWidth: "200px",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleLogout}
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
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Theme Toggle */}
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

      {/* Main Content Container */}
      <main className="govMain">
        {showBack && (
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 0" }}>
            <BackButton />
          </div>
        )}
        {children}
      </main>

      {/* Security Footer Band */}
      <div
        style={{
          borderTop: "1px solid var(--gov-edge)",
          padding: "20px 16px",
          background: "rgba(255,255,255,0.02)",
          fontSize: "12px",
          color: "var(--gov-muted)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0 }}>
          💻 Secure session active • 🔒 End-to-end encrypted • ✓ WebAuthn verified
        </p>
      </div>
    </div>
  );
}
