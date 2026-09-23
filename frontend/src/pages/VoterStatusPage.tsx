import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Plane, Lock } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import PageHeader from "../components/common/PageHeader";
import Notice from "../components/common/Notice";
import CountrySelect from "../components/common/CountrySelect";
import { setVoterStatus } from "../lib/api";
import { useMe } from "../lib/useMe";

/**
 * Mandatory step after sign-in for voters who haven't said whether they vote
 * as residents or from the diaspora. Validated again on the server.
 */
export default function VoterStatusPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const { me, loading } = useMe();
  const [type, setType] = useState<"resident" | "diaspora" | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const next = (loc.state as any)?.next ?? "/dashboard";

  useEffect(() => {
    if (me?.voter_status) {
      setType(me.voter_status.voter_type);
      setCountry(me.voter_status.residence_country);
    }
  }, [me]);

  const locked = !!me?.voter_status.locked;
  const canSave = !!type && (type === "resident" || !!country) && !locked;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setErr(null);
    try {
      await setVoterStatus(type!, type === "diaspora" ? country : null);
      nav(next, { replace: true });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const option = (value: "resident" | "diaspora", icon: React.ReactNode, title: string, text: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={type === value}
      className="gv-choice"
      disabled={locked}
      onClick={() => setType(value)}
      data-testid={`status-${value}`}
    >
      <span className="dot" aria-hidden />
      <span style={{ display: "grid", gap: 4 }}>
        <span className="gv-row" style={{ gap: 8, fontWeight: 900, fontSize: 17 }}>{icon}{title}</span>
        <span className="gv-muted" style={{ fontSize: 14, lineHeight: 1.5 }}>{text}</span>
      </span>
      <span />
    </button>
  );

  return (
    <DashboardLayout userEmail={me?.email}>
      <div className="gv-page" style={{ maxWidth: 720 }}>
        <PageHeader pill="Voter status" title="Where are you voting from?">
          Choose once. Residents vote from Lebanon; diaspora voters living abroad vote for their home district from their country of residence.
        </PageHeader>

        {loading ? (
          <div className="gv-muted">Loading…</div>
        ) : (
          <div className="gv-stack">
            {locked && (
              <Notice kind="warn">
                <Lock size={14} style={{ verticalAlign: -2 }} /> Your status can't change while an election you can vote in is open
                ({me!.voter_status.locked_by.join(", ")}).
              </Notice>
            )}
            <div role="radiogroup" aria-label="Voter status" className="gv-stack" style={{ gap: 12 }}>
              {option("resident", <Home size={18} />, "I'm voting as a resident", "I live in Lebanon.")}
              {option("diaspora", <Plane size={18} />, "I'm voting from the diaspora (abroad)", "I live outside Lebanon and vote for my home district from where I live.")}
            </div>

            {type === "diaspora" && (
              <div className="gv-card">
                <CountrySelect value={country} onChange={setCountry} exclude={["LB"]} />
                <p className="gv-muted" style={{ fontSize: 13, marginBottom: 0 }}>
                  Your ballot is your home district's ballot. The country is used only for turnout statistics and the participation map — never with your vote.
                </p>
              </div>
            )}

            {err && <Notice kind="error">{err}</Notice>}

            <div className="gv-sticky-actions">
              <button type="button" className="gv-btn primary block" disabled={!canSave || busy} onClick={save} data-testid="status-save">
                {busy ? "Saving…" : "Continue"}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
