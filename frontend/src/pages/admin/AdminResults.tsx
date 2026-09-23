import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import AdminLayout from "./AdminLayout";
import {
  adminListElections,
  adminResults,
  adminAuditLogs,
  adminVerifyChain,
  adminTurnoutTimeline,
  adminGeoResults,
  type AdminElection,
  type GeoResults,
  type TurnoutTimeline,
  type AdminResultsData,
  type ChainVerification,
  type AuditLogEntry,
} from "../../lib/api";
import { Card, Section, Metric } from "../../components/common/Card";
import { ElectionStatusStepper, ElectionTimeProgress } from "../../components/admin/ElectionProgress";
import { TurnoutTimelineChart } from "../../components/admin/TurnoutTimelineChart";
import { LebanonResultsMap } from "../../components/admin/LebanonResultsMap";
import { Link } from "react-router-dom";
import Notice from "../../components/common/Notice";
import { adminVerify, adminReportUrl } from "../../lib/api";
import type { VerifierReport } from "../../crypto/verifier";
import { errorMessage } from "../../lib/errors";

export default function AdminResults() {
  const [elections, setElections] = useState<AdminElection[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<AdminResultsData | null>(null);
  const [timeline, setTimeline] = useState<TurnoutTimeline | null>(null);
  const [geo, setGeo] = useState<GeoResults | null>(null);
  const [chain, setChain] = useState<ChainVerification | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerifierReport | null>(null);

  useEffect(() => {
    adminListElections()
      .then((d) => {
        setElections(d.elections);
        if (d.elections.length) setSelected(d.elections[0].id);
      })
      .catch((e) => setErr(e.message));
    adminVerifyChain().then(setChain).catch(() => {});
    adminAuditLogs(15).then((d) => setLogs(d.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selected == null) return;
    adminResults(selected).then(setResults).catch((e) => setErr(e.message));
    adminTurnoutTimeline(selected).then(setTimeline).catch(() => {});
    adminGeoResults(selected).then(setGeo).catch(() => {});
    adminVerify(selected).then(setVerification).catch(() => {});
  }, [selected]);

  // End-to-end elections have no results until the trustees decrypt the tally.
  const e2eHidden = results?.crypto_scheme === "e2e" && !results?.results_available;

  function choose(id: number) {
    setSelected(id);
    setResults(null);
    setTimeline(null);
    setGeo(null);
    setVerification(null);
  }

  async function reverify() {
    setChain(null);
    try {
      setChain(await adminVerifyChain());
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  return (
    <AdminLayout title="Results & Audit">
      {err && <div className="govError" style={{ marginBottom: 14 }}>{err}</div>}

      {/* Election picker — every panel below reports on the selected election. */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <select
          value={selected ?? ""}
          onChange={(e) => choose(Number(e.target.value))}
          style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--gov-edge)", background: "var(--gov-card2, rgba(255,255,255,0.03))", color: "var(--gov-ink)" }}
        >
          {elections.map((el) => (
            <option key={el.id} value={el.id}>{el.title}</option>
          ))}
        </select>
      </div>

      {results?.crypto_scheme === "e2e" && (
        <div style={{ marginBottom: 20, display: "grid", gap: 12 }}>
          {e2eHidden ? (
            <Notice kind="info">Results for this election are encrypted. They appear only after polling closes and the trustees decrypt the tally (status: {results.tally_status}). Live turnout and the participation map are on the Overview.</Notice>
          ) : verification ? (
            <Notice kind={verification.ok ? "ok" : "error"}>
              <strong>{verification.ok ? "Verified ✓" : "Verification FAILED"}</strong> — every ballot proof, the homomorphic tally and the trustees' decryption proofs were re-checked.{" "}
              <Link to={`/verify?election=${selected}`}>Re-run it independently in the browser</Link>.
            </Notice>
          ) : null}
          {selected != null && <a className="gv-btn" href={adminReportUrl(selected)} style={{ justifySelf: "start" }}>Download election report (.xlsx)</a>}
        </div>
      )}

      {/* Map of Lebanon: turnout and votes per governorate. */}
      <div style={{ marginBottom: 20, display: e2eHidden ? "none" : undefined }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>Results by region</h2>
            <span style={{ fontSize: 12, color: "var(--gov-muted)" }}>
              Hover a governorate for its figures • click to pin the full breakdown
            </span>
          </div>
          {geo ? (
            <LebanonResultsMap data={geo} />
          ) : (
            <div style={{ color: "var(--gov-muted)" }}>Loading map…</div>
          )}
        </Card>
      </div>

      {/* Chain integrity */}
      <div style={{ marginBottom: 20 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {chain ? (
              chain.valid ? <ShieldCheck size={26} color="#47a76f" /> : <ShieldAlert size={26} color="#e5484d" />
            ) : (
              <RefreshCw size={22} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900 }}>
                Ballot chain integrity: {chain ? (chain.valid ? "Verified ✓" : "BROKEN ✗") : "Checking…"}
              </div>
              <div style={{ fontSize: 13, color: "var(--gov-muted)" }}>
                {chain?.message ?? ""}
                {chain?.verified_ballots != null ? ` • ${chain.verified_ballots} ballot(s)` : ""}
              </div>
            </div>
            <button className="govBtn" onClick={reverify} style={{ padding: "8px 14px", display: "inline-flex", gap: 6, alignItems: "center" }}>
              <RefreshCw size={14} /> Re-verify
            </button>
          </div>
        </Card>
      </div>

      {/* Results */}
      <div style={{ marginBottom: 20 }}>
        <Card>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>Nationwide results</h2>
          </div>

          {!results ? (
            <div style={{ color: "var(--gov-muted)" }}>Loading…</div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <ElectionStatusStepper status={results.election.status} />
                <div style={{ marginTop: 10 }}>
                  <ElectionTimeProgress
                    startsAt={results.election.starts_at}
                    endsAt={results.election.ends_at}
                    status={results.election.status}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
                <Metric label="Registered" value={results.turnout.registered} />
                <Metric label="Voted" value={results.turnout.voted} />
                <Metric label="Ballots" value={results.turnout.ballots_recorded} />
                <Metric label="Turnout" value={`${results.turnout.turnout_percentage}%`} />
              </div>

              {e2eHidden ? (
                <div style={{ color: "var(--gov-muted)" }}>Results are hidden until the tally is decrypted.</div>
              ) : results.lists.length === 0 ? (
                <div style={{ color: "var(--gov-muted)" }}>No votes recorded yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {results.lists.map((l) => (
                    <div key={l.list_id}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700 }}>{l.list_name}</span>
                        <span style={{ color: "var(--gov-muted)" }}>{l.votes} ({l.percentage}%)</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ width: `${l.percentage}%`, height: "100%", background: "var(--gov-gold, #c9a227)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.preferential_candidates?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Preferential candidates</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {results.preferential_candidates.map((c) => (
                      <span key={c.candidacy_id} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 999, border: "1px solid var(--gov-edge)" }}>
                        {c.candidate_name}: <b>{c.votes}</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Ballots cast over time</div>
                {timeline ? (
                  <TurnoutTimelineChart data={timeline} />
                ) : (
                  <div style={{ color: "var(--gov-muted)" }}>Loading…</div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Audit log */}
      <Card>
        <Section title="Recent audit log">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--gov-muted)" }}>
                  <th style={th()}>Action</th>
                  <th style={th()}>Actor</th>
                  <th style={th()}>When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} style={{ borderTop: "1px solid var(--gov-edge)" }}>
                    <td style={td()}><code>{l.action}</code></td>
                    <td style={td()}>{l.actor?.email ?? "system"}</td>
                    <td style={td()}>{l.created_at ? new Date(l.created_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td style={td()} colSpan={3}>No audit entries.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </Card>
    </AdminLayout>
  );
}

const th = (): React.CSSProperties => ({ padding: "8px 10px", fontWeight: 700 });
const td = (): React.CSSProperties => ({ padding: "8px 10px" });
