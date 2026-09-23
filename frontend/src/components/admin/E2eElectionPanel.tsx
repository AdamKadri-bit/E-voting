import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Plane, Download, ShieldCheck, RotateCcw, Unlock, Search, X } from "lucide-react";
import Notice from "../common/Notice";
import {
  adminAssignTrustees,
  adminCeremony,
  adminReportUrl,
  adminResetCeremony,
  adminSetDiaspora,
  adminStartTally,
  adminTrusteeCandidates,
  type AdminElection,
  type CeremonyState,
} from "../../lib/api";

type Candidate = { id: number; name: string; email: string; role: string };

/**
 * Admin controls for one election's end-to-end features: diaspora voting
 * on/off, trustees and the k-of-n threshold, key-ceremony progress, tally
 * start, and the downloadable report.
 */
export default function E2eElectionPanel({ election, onChange }: { election: AdminElection; onChange: () => void }) {
  const [ceremony, setCeremony] = useState<CeremonyState | null>(null);
  const [picked, setPicked] = useState<Candidate[]>([]);
  const [threshold, setThreshold] = useState(election.trustee_threshold ?? 2);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Candidate[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const e2e = election.crypto_scheme !== "legacy";

  const load = () => adminCeremony(election.id).then(setCeremony).catch(() => {});
  useEffect(() => {
    if (e2e) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [election.id]);

  useEffect(() => {
    const t = setTimeout(() => adminTrusteeCandidates(q).then((r) => setFound(r.users)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: "ok", text: ok });
      await load();
      onChange();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  const box: React.CSSProperties = { border: "1px solid var(--gov-edge)", borderRadius: 16, padding: 18, background: "var(--gov-card)", display: "grid", gap: 12, minWidth: 0 };

  if (!e2e) {
    return <Notice kind="warn">This is a legacy election (server-key ballots, cast before end-to-end encryption). It keeps its historical results but accepts no new ballots.</Notice>;
  }

  const canEditTrustees = election.status === "draft" && (ceremony?.status ?? "pending") !== "in_progress" && ceremony?.status !== "complete";

  return (
    <div style={{ display: "grid", gap: 16 }} data-testid="e2e-panel">
      <div style={box}>
        <div className="gv-row" style={{ justifyContent: "space-between" }}>
          <div className="gv-row" style={{ gap: 8, fontWeight: 900 }}><Plane size={18} /> Diaspora voting</div>
          <label className="gv-row" style={{ gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!election.diaspora_voting_enabled}
              disabled={busy || election.status === "closed"}
              onChange={(e) => act(() => adminSetDiaspora(election, e.target.checked), e.target.checked ? "Diaspora voting enabled." : "Diaspora voting disabled.")}
              data-testid="diaspora-toggle"
            />
            <span>{election.diaspora_voting_enabled ? "Enabled" : "Disabled"}</span>
          </label>
        </div>
        <div className="gv-muted" style={{ fontSize: 13 }}>When disabled, voters registered as diaspora see a clear message instead of a ballot. Residents are unaffected.</div>
      </div>

      <div style={box}>
        <div className="gv-row" style={{ justifyContent: "space-between" }}>
          <div className="gv-row" style={{ gap: 8, fontWeight: 900 }}><KeyRound size={18} /> Trustees & key ceremony</div>
          <span className="gv-pill" style={{ margin: 0 }}>{ceremony?.phase ?? "…"}</span>
        </div>

        {ceremony && ceremony.trustees.length > 0 && (
          <div className="gv-table-wrap">
            <table className="gv-table">
              <thead><tr><th>#</th><th>Trustee</th><th>Round 1</th><th>Round 2</th><th>Round 3</th></tr></thead>
              <tbody>
                {ceremony.trustees.map((t) => (
                  <tr key={t.trustee_index}>
                    <td>{t.trustee_index}</td>
                    <td>{t.name}</td>
                    <td>{t.round1_done ? "✓" : "—"}</td>
                    <td>{t.round2_done ? "✓" : "—"}</td>
                    <td>{t.round3_done ? (t.complaints.length ? `complaint vs ${t.complaints.join(",")}` : "✓") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ceremony?.joint_public_key && <div className="gv-mono gv-muted" style={{ fontSize: 12 }}>Election key {ceremony.joint_public_key}</div>}
        {ceremony && <div className="gv-muted" style={{ fontSize: 13 }}>{ceremony.threshold} of {ceremony.trustee_count} trustees needed to decrypt. Voting can't open until the ceremony completes.</div>}

        {canEditTrustees && (
          <div className="gv-stack" style={{ gap: 10, borderTop: "1px solid var(--gov-edge)", paddingTop: 12 }}>
            <div style={{ fontWeight: 800 }}>Assign trustees</div>
            <div className="gv-muted" style={{ fontSize: 13 }}>Suggested: Dr. Ahmad Kassem alongside two administrators, threshold 2 of 3.</div>
            <div className="gv-row">
              {picked.map((p) => (
                <span key={p.id} className="gv-pill" style={{ margin: 0 }}>
                  {p.name}
                  <button type="button" aria-label={`Remove ${p.name}`} onClick={() => setPicked(picked.filter((x) => x.id !== p.id))} style={{ background: "none", border: 0, color: "inherit", cursor: "pointer", minHeight: 0 }}><X size={14} /></button>
                </span>
              ))}
            </div>
            <div className="gv-row">
              <Search size={16} />
              <input className="govInput" placeholder="Search verified accounts by name or email" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px" }} />
            </div>
            <div className="gv-row">
              {found.filter((u) => !picked.some((p) => p.id === u.id)).slice(0, 8).map((u) => (
                <button key={u.id} type="button" className="gv-btn" style={{ minHeight: 44, padding: "6px 12px", fontSize: 13 }} onClick={() => setPicked([...picked, u])}>
                  + {u.name} <span className="gv-muted">({u.role})</span>
                </button>
              ))}
            </div>
            <label className="govLabel" style={{ maxWidth: 220 }}>
              <span>Threshold k (of {picked.length || "n"})</span>
              <input className="govInput" type="number" min={1} max={Math.max(1, picked.length)} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
            </label>
            <button
              type="button"
              className="gv-btn gold"
              disabled={busy || picked.length === 0 || threshold < 1 || threshold > picked.length}
              onClick={() => act(() => adminAssignTrustees(election.id, picked.map((p) => p.id), threshold), "Trustees assigned. Each trustee now runs round 1 from their own browser.")}
            >
              Save trustees ({threshold} of {picked.length})
            </button>
          </div>
        )}

        {election.status === "draft" && ceremony && ["failed", "in_progress", "complete"].includes(ceremony.status) && (
          <button type="button" className="gv-btn danger" disabled={busy} onClick={() => confirm("Reset the key ceremony? Every trustee must start again.") && act(() => adminResetCeremony(election.id), "Ceremony reset.")} style={{ justifySelf: "start" }}>
            <RotateCcw size={16} /> Reset ceremony
          </button>
        )}
      </div>

      <div style={box}>
        <div className="gv-row" style={{ gap: 8, fontWeight: 900 }}><Unlock size={18} /> Tally & report</div>
        <div className="gv-muted" style={{ fontSize: 13 }}>
          Tally status: <strong>{election.tally_status ?? "none"}</strong>. Closing the election forms the encrypted tally automatically; trustees then decrypt it from their own devices.
        </div>
        <div className="gv-row">
          {election.status === "closed" && election.tally_status === "none" && ceremony?.status === "complete" && (
            <button type="button" className="gv-btn gold" disabled={busy} onClick={() => act(() => adminStartTally(election.id), "Encrypted tally formed; waiting for trustees.")}>Form the encrypted tally</button>
          )}
          <a className="gv-btn" href={adminReportUrl(election.id)}><Download size={16} /> Download report (.xlsx)</a>
          <Link className="gv-btn blue" to={`/verify?election=${election.id}`}><ShieldCheck size={16} /> Verifier</Link>
          <Link className="gv-btn" to={`/board/${election.id}`}>Bulletin board</Link>
        </div>
      </div>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
    </div>
  );
}
