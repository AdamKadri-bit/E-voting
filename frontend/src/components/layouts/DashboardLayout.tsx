import type { ReactNode } from "react";
import { useGovTheme } from "../../ui/useGovTheme";
import { Sun, Moon, TreePine, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";

type DashboardLayoutProps = {
  userEmail?: string;
  userRole?: "voter" | "admin";
  onLogout?: () => void;
  children: ReactNode;
};

export default function DashboardLayout({
  userEmail = "user@example.com",
  onLogout = () => {},
  children,
}: DashboardLayoutProps) {
  const { theme, toggle } = useGovTheme();
  const [showDropdown, setShowDropdown] = useState(false);

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
          {/* User Profile Dropdown */}
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
                  onClick={onLogout}
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
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.05)")
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
      <main className="govMain">{children}</main>

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