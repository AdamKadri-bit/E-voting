import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import AdminLayout from "./AdminLayout";
import {
  adminListElections,
  adminResults,
  adminAuditLogs,
  adminVerifyChain,
  type AdminElection,
} from "../../lib/api";

export default function AdminResults() {
  const [elections, setElections] = useState<AdminElection[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<any | null>(null);
  const [chain, setChain] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminListElections()
      .then((d) => {
        setElections(d.elections);
        if (d.elections.length) setSelected(d.elections[0].id);
      })
      .catch((e) => setErr(e.message));
    adminVerifyChain().then(setChain).catch(() => {});
    adminAuditLogs(15).then((d: any) => setLogs(d.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selected == null) return;
    setResults(null);
    adminResults(selected).then(setResults).catch((e) => setErr(e.message));
  }, [selected]);

  async function reverify() {
    setChain(null);
    try {
      setChain(await adminVerifyChain());
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <AdminLayout title="Results & Audit">
      {err && <div className="govError" style={{ marginBottom: 14 }}>{err}</div>}

      {/* Chain integrity */}
      <div
        style={{
          border: "1px solid var(--gov-edge)",
          borderRadius: 16,
          padding: 18,
          background: "var(--gov-card)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 20,
        }}
      >
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

      {/* Results */}
      <div style={{ border: "1px solid var(--gov-edge)", borderRadius: 16, padding: 20, background: "var(--gov-card)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>Results</h2>
          <select
            value={selected ?? ""}
            onChange={(e) => setSelected(Number(e.target.value))}
            style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--gov-edge)", background: "var(--gov-card2, rgba(255,255,255,0.03))", color: "var(--gov-ink)" }}
          >
            {elections.map((el) => (
              <option key={el.id} value={el.id}>{el.title}</option>
            ))}
          </select>
        </div>

        {!results ? (
          <div style={{ color: "var(--gov-muted)" }}>Loading…</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
              <Metric label="Registered" value={results.turnout.registered} />
              <Metric label="Voted" value={results.turnout.voted} />
              <Metric label="Ballots" value={results.turnout.ballots_recorded} />
              <Metric label="Turnout" value={`${results.turnout.turnout_percentage}%`} />
            </div>

            {results.lists.length === 0 ? (
              <div style={{ color: "var(--gov-muted)" }}>No votes recorded yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {results.lists.map((l: any) => (
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
                  {results.preferential_candidates.map((c: any) => (
                    <span key={c.candidacy_id} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 999, border: "1px solid var(--gov-edge)" }}>
                      {c.candidate_name}: <b>{c.votes}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Audit log */}
      <div style={{ border: "1px solid var(--gov-edge)", borderRadius: 16, padding: 20, background: "var(--gov-card)" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 900 }}>Recent audit log</h2>
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
      </div>
    </AdminLayout>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--gov-edge)", borderRadius: 12, padding: 14, background: "rgba(255,255,255,0.02)" }}>
      <div style={{ fontSize: 12, color: "var(--gov-muted)", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
    </div>
  );
}
const th = (): React.CSSProperties => ({ padding: "8px 10px", fontWeight: 700 });
const td = (): React.CSSProperties => ({ padding: "8px 10px" });
