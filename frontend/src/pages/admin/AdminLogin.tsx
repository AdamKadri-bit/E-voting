// src/pages/admin/AdminLogin.tsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GovShell from "../../ui/GovShell";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

/**
 * Dedicated entry point for the admin panel.
 *
 * This is a separate URL, not a separate security boundary: it posts to the
 * same /auth/login endpoint as the voter page, and access is enforced by the
 * EnsureAdmin middleware on every /api/admin route. Signing in here with a
 * non-admin account ends the session again rather than silently dropping the
 * user on the voter dashboard.
 */
export default function AdminLogin() {
  const navJump = useNavigate();

  const [mailBox, setMailBox] = useState("");
  const [secretPass, setSecretPass] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [bannerErr, setBannerErr] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => mailBox.trim().length > 3 && secretPass.length >= 1,
    [mailBox, secretPass]
  );

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setBannerErr(null);

    if (!canSubmit) {
      setBannerErr("Enter your email and password.");
      return;
    }

    setIsWorking(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: mailBox.trim(),
          password: secretPass,
        }),
      });

      const j = await res.json().catch(() => null);

      if (!res.ok) {
        setBannerErr(j?.message || `Sign in failed (${res.status}).`);
        return;
      }

      // The login response only sets the cookie; the role lives inside the JWT,
      // so the server has to be asked which panel this account belongs to.
      const meRes = await fetch(`${API_URL}/me`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const me = await meRes.json().catch(() => null);

      if (me?.user?.role !== "admin") {
        // Don't leave a half-useful voter session behind on the admin URL.
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { Accept: "application/json" },
          credentials: "include",
        }).catch(() => {});

        setBannerErr("This account does not have administrator access.");
        return;
      }

      navJump("/admin", { replace: true });
    } catch (e: any) {
      setBannerErr(e?.message || "Sign in failed.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <GovShell
      title="Administrator sign in"
      subtitle="Election control panel. Administrator accounts only — voters should use the standard sign-in page."
      right={
        <>
          <form className="govForm" onSubmit={onSubmit}>
            <label className="govLabel">
              <span>Email</span>
              <input
                className="govInput"
                type="email"
                autoComplete="email"
                value={mailBox}
                onChange={(e) => setMailBox(e.target.value)}
                placeholder="name@example.com"
              />
            </label>

            <label className="govLabel">
              <span>Password</span>
              <input
                className="govInput"
                type="password"
                autoComplete="current-password"
                value={secretPass}
                onChange={(e) => setSecretPass(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            {bannerErr && <div className="govError">{bannerErr}</div>}

            <button
              className="govBtn govBtnPrimary"
              type="submit"
              disabled={!canSubmit || isWorking}
              style={{ marginTop: 14 }}
            >
              {isWorking ? "Signing in…" : "Sign in to admin panel"}
            </button>
          </form>

          <div style={{ marginTop: 16, fontSize: 13 }}>
            Not an administrator? <Link to="/login">Voter sign in</Link>
          </div>
        </>
      }
    />
  );
}
