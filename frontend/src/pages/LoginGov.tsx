// src/pages/LoginGov.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import GovShell from "../ui/GovShell";
import OAuthButtons from "../ui/OAuthButtons";

const API_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

export default function LoginGov() {
  const navJump = useNavigate();
  const loc = useLocation();

  const [mailBox, setMailBox] = useState("");
  const [secretPass, setSecretPass] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [bannerErr, setBannerErr] = useState<string | null>(null);
  const [bannerOk, setBannerOk] = useState<string | null>(null);
  const [needVerify, setNeedVerify] = useState(false);

  useEffect(() => {
    const flash = (loc.state as any)?.flash;
    if (flash) {
      setBannerOk(String(flash));
      // clear state so it doesn't persist on refresh
      navJump(loc.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    return mailBox.trim().length > 3 && secretPass.length >= 1;
  }, [mailBox, secretPass]);

  async function onLoginSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setBannerErr(null);
    setBannerOk(null);
    setNeedVerify(false);

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
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email: mailBox.trim(),
          password: secretPass,
        }),
      });

      const j = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = j?.message || `Sign in failed (${res.status}).`;
        if (res.status === 403) {
          setNeedVerify(true);
          setBannerErr(msg);
          return;
        }
        setBannerErr(msg);
        return;
      }

      navJump("/dashboard");
    } catch (e: any) {
      setBannerErr(e?.message || "Sign in failed.");
    } finally {
      setIsWorking(false);
    }
  }

  async function onResendVerify() {
    setBannerErr(null);
    setBannerOk(null);

    const email = mailBox.trim();
    if (email.length < 4) {
      setBannerErr("Enter your email first.");
      return;
    }

    setIsResending(true);
    try {
      // NOTE: this endpoint must exist on backend.
      // If your backend route name is different, change it here.
      const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const j = await res.json().catch(() => null);

      if (!res.ok) {
        setBannerErr(j?.message || `Could not resend (${res.status}).`);
        return;
      }

      setBannerOk("Verification email sent. Check your inbox (and spam).");
    } catch (e: any) {
      setBannerErr(e?.message || "Could not resend.");
    } finally {
      setIsResending(false);
    }
  }

  function onOAuthPick(provider: "google" | "microsoft") {
    setBannerErr(`OAuth (${provider}) is not wired yet. UI is ready.`);
  }

  return (
    <GovShell
      title="Sign in"
      subtitle="Access your voting portal. Authentication will be linked to the voter registry and eligibility rules."
      right={
        <>
          <form className="govForm" onSubmit={onLoginSubmit}>
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

            {bannerOk && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                  background: "rgba(34, 197, 94, 0.08)",
                  color: "rgba(12, 74, 36, 0.95)",
                  fontSize: 13,
                }}
              >
                {bannerOk}
              </div>
            )}

            {bannerErr && <div className="govError">{bannerErr}</div>}

            {needVerify && (
              <button
                type="button"
                className="govBtn govBtnPrimary"
                disabled={isWorking || isResending}
                onClick={onResendVerify}
                style={{ marginTop: 10 }}
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </button>
            )}

            <button className="govBtn govBtnPrimary" disabled={isWorking} type="submit">
              {isWorking ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="govDivider">or</div>

          <OAuthButtons busy={isWorking || isResending} onPick={onOAuthPick} />

          <div style={{ marginTop: 14, fontSize: 13, color: "rgb(175, 120, 24)" }}>
            No account? <Link to="/signup">Create one</Link>
          </div>
        </>
      }
    />
  );
}
