// src/pages/SignupGov.tsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GovShell from "../ui/GovShell";
import OAuthButtons from "../ui/OAuthButtons";

const API_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

export default function SignupGov() {
  const navJump = useNavigate();

  const [citizenName, setCitizenName] = useState("");
  const [mailBox, setMailBox] = useState("");
  const [secretPass, setSecretPass] = useState("");
  const [secretAgain, setSecretAgain] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [bannerErr, setBannerErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (citizenName.trim().length < 3) return false;
    if (mailBox.trim().length < 4) return false;
    if (secretPass.length < 8) return false;
    if (secretPass !== secretAgain) return false;
    return true;
  }, [citizenName, mailBox, secretPass, secretAgain]);

  async function onSignupSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setBannerErr(null);

    if (!canSubmit) {
      setBannerErr("Check your details. Password must be 8+ chars and match.");
      return;
    }

    setIsWorking(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: citizenName.trim(),
          email: mailBox.trim(),
          password: secretPass,
        }),
      });

      const j = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          j?.message ||
          (j?.errors ? Object.values(j.errors).flat().join(" ") : null) ||
          `Signup failed (${res.status}).`;
        setBannerErr(msg);
        return;
      }

      navJump("/login", {
        state: { flash: "Account created. Check your email to verify, then sign in." },
      });
    } catch (e: any) {
      setBannerErr(e?.message || "Signup failed.");
    } finally {
      setIsWorking(false);
    }
  }

  function onOAuthPick(provider: "google" | "microsoft") {
    setBannerErr(`OAuth (${provider}) is not wired yet. UI is ready.`);
  }

  return (
    <GovShell
      title="Create account"
      subtitle="Registration will be validated against the voter registry (age 21+, civil rights status, registered area)."
      right={
        <>
          <form className="govForm" onSubmit={onSignupSubmit}>
            <label className="govLabel">
              <span>Full name</span>
              <input
                className="govInput"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="Full name"
              />
            </label>

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

            <div className="govGrid2">
              <label className="govLabel">
                <span>Password</span>
                <input
                  className="govInput"
                  type="password"
                  autoComplete="new-password"
                  value={secretPass}
                  onChange={(e) => setSecretPass(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </label>

              <label className="govLabel">
                <span>Confirm password</span>
                <input
                  className="govInput"
                  type="password"
                  autoComplete="new-password"
                  value={secretAgain}
                  onChange={(e) => setSecretAgain(e.target.value)}
                  placeholder="Repeat password"
                />
              </label>
            </div>

            {bannerErr && <div className="govError">{bannerErr}</div>}

            <button className="govBtn govBtnPrimary" disabled={isWorking} type="submit">
              {isWorking ? "Creating..." : "Create account"}
            </button>
          </form>

          <div className="govDivider">or</div>

          <OAuthButtons busy={isWorking} onPick={onOAuthPick} />

          <div style={{ marginTop: 14, fontSize: 13, color: "rgb(175, 120, 24)" }}>
            Already registered? <Link to="/login">Sign in</Link>
          </div>
        </>
      }
    />
  );
}
