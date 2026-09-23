import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Unlock, ChevronRight } from "lucide-react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import PageHeader from "../../components/common/PageHeader";
import Notice from "../../components/common/Notice";
import { trusteeSeats, type TrusteeSeat } from "../../lib/api";
import { useMe } from "../../lib/useMe";

/** A trustee's elections and what each one needs from them next. */
export default function TrusteeHomePage() {
  const { me } = useMe();
  const [seats, setSeats] = useState<TrusteeSeat[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    trusteeSeats().then((r) => setSeats(r.seats)).catch((e) => setErr(e.message));
  }, []);

  return (
    <DashboardLayout userEmail={me?.email}>
      <div className="gv-page">
        <PageHeader pill={<><KeyRound size={14} /> Trustee</>} title="Trustee duties">
          Trustees jointly hold the election key. Your key share is generated in this browser and saved to a passphrase-protected file on your device — it never reaches the server.
        </PageHeader>
        {err && <Notice kind="error">{err}</Notice>}
        {seats?.length === 0 && <Notice>You are not a trustee of any election.</Notice>}
        <div className="gv-grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
          {seats?.map((s) => {
            const needsKeys = ["round1", "round2", "round3"].includes(s.phase) && !s.my_rounds[s.phase as "round1" | "round2" | "round3"];
            const needsDecrypt = s.election.tally_status === "decrypting" && !s.decryption_submitted;
            return (
              <div key={s.election.id} className="gv-card gv-stack" data-testid={`seat-${s.election.id}`}>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{s.election.title}</div>
                <div className="gv-muted" style={{ fontSize: 13 }}>
                  Trustee #{s.trustee_index} of {s.election.trustee_count} · {s.election.threshold} needed to decrypt
                </div>
                <div className="gv-muted" style={{ fontSize: 13 }}>Key ceremony: <strong>{s.phase}</strong> · tally: <strong>{s.election.tally_status}</strong></div>
                {needsKeys && <Notice kind="warn">Your action is needed in the key ceremony.</Notice>}
                {needsDecrypt && <Notice kind="warn">Polls have closed — your partial decryption is needed.</Notice>}
                <div className="gv-row">
                  <Link className={`gv-btn ${needsKeys ? "gold" : ""}`} to={`/trustee/elections/${s.election.id}/keys`}><KeyRound size={16} /> Key ceremony <ChevronRight size={16} /></Link>
                  <Link className={`gv-btn ${needsDecrypt ? "gold" : ""}`} to={`/trustee/elections/${s.election.id}/decrypt`}><Unlock size={16} /> Decryption</Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
