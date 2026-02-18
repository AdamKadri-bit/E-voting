import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GovShell from "../ui/GovShell";
import OAuthButtons from "../ui/OAuthButtons";

export default function LoginGov() {
  const navJump = useNavigate();

  const [mailBox, setMailBox] = useState("");
  const [secretPass, setSecretPass] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [bannerErr, setBannerErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return mailBox.trim().length > 3 && secretPass.length >= 1;
  }, [mailBox, secretPass]);

  async function onLoginSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setBannerErr(null);

    if (!canSubmit) {
      setBannerErr("Enter your email and password.");
      return;
    }

    setIsWorking(true);
    try {
      // STUB: replace with backend auth call later
      await new Promise((r) => setTimeout(r, 420));
      navJump("/dashboard");
    } catch {
      setBannerErr("Sign in failed.");
    } finally {
      setIsWorking(false);
    }
  }

  function onOAuthPick(provider: "google" | "microsoft") {
    // UI stub: later we redirect to backend /oauth/{provider}
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

            {bannerErr && <div className="govError">{bannerErr}</div>}

            <button className="govBtn govBtnPrimary" disabled={isWorking} type="submit">
              {isWorking ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="govDivider">or</div>

          <OAuthButtons busy={isWorking} onPick={onOAuthPick} />

          <div style={{ marginTop: 14, fontSize: 13, color: "rgb(175, 120, 24)" }}>
            No account? <Link to="/signup">Create one</Link>
          </div>
        </>
      }
    />
  );
}
