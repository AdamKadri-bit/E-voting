import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ListChecks, KeyRound, Search, ShieldCheck, Package } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import PageHeader from "../components/common/PageHeader";
import Notice from "../components/common/Notice";
import { ApiError, boardLookup, boardPage, boardSummary, type BoardRow, type BoardSummary } from "../lib/api";
import { useMe } from "../lib/useMe";
import { describeSelection } from "../crypto/ballot";
import { normaliseShortCode } from "../crypto/encoding";

const STATUS_TONE: Record<string, string> = { counted: "green", superseded: "", audited: "blue" };

/**
 * One election's public bulletin board: key material, trustees, the client
 * bundle hash, and every ballot (cast and audited) with its ciphertexts and
 * proofs. Tracking-code lookup works with the short or the full code.
 */
export default function BoardPage() {
  const { electionId } = useParams();
  const eid = Number(electionId);
  const [params, setParams] = useSearchParams();
  const { me } = useMe();
  const [summary, setSummary] = useState<BoardSummary | null>(null);
  const [kind, setKind] = useState<"cast" | "audited">("cast");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<{ data: BoardRow[]; last_page: number; total: number } | null>(null);
  const [query, setQuery] = useState(params.get("code") ?? "");
  const [found, setFound] = useState<BoardRow | null | "none">(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    boardSummary(eid).then(setSummary).catch((e) => setErr(e.message));
  }, [eid]);

  useEffect(() => {
    boardPage(eid, page, "", kind).then(setRows).catch((e) => setErr(e.message));
  }, [eid, page, kind]);

  async function lookup(code: string) {
    if (!code.trim()) return;
    setParams({ code: code.trim() });
    try {
      setFound(await boardLookup(eid, normaliseShortCode(code)));
    } catch (e) {
      setFound((e as ApiError).status === 404 ? "none" : null);
    }
  }

  useEffect(() => {
    const c = params.get("code");
    if (c) lookup(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eid]);

  const manifests = new Map((summary?.manifests ?? []).map((m) => [m.id, m]));

  return (
    <DashboardLayout isGuest={!me} userEmail={me?.email}>
      <div className="gv-page">
        <PageHeader pill={<><ListChecks size={14} /> Bulletin board</>} title={summary?.election.title ?? "Bulletin board"}>
          Public record of this election. Nothing here identifies a voter or reveals a vote — except audited ballots, which were spoiled on purpose and never counted.
        </PageHeader>
        {err && <Notice kind="error">{err}</Notice>}

        <form
          className="gv-card gv-row"
          onSubmit={(e) => {
            e.preventDefault();
            lookup(query);
          }}
          style={{ marginBottom: 16 }}
        >
          <label htmlFor="code" style={{ fontWeight: 900, width: "100%" }}>Look up a tracking code</label>
          <input id="code" className="govInput" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" style={{ flex: "1 1 220px", fontFamily: "ui-monospace, monospace" }} autoCapitalize="characters" autoComplete="off" />
          <button className="gv-btn gold" type="submit"><Search size={16} /> Find</button>
          {found === "none" && <div style={{ width: "100%" }}><Notice kind="warn">No ballot with that code is on this board.</Notice></div>}
          {found && found !== "none" && (
            <div style={{ width: "100%" }} data-testid="lookup-result">
              <Notice kind={found.status === "counted" ? "ok" : "info"}>
                <strong>{found.short_code}</strong> is on the board — status <strong>{found.status}</strong>.
                {found.status === "superseded" && " A later ballot from the same voter replaced it."}
                {found.audit && manifests.get(found.audit.manifest_id) && (
                  <> Audited ballot content: {(() => { const d = describeSelection(manifests.get(found.audit!.manifest_id)!, found.audit!.selections); return `${d.list ?? "—"}${d.candidate ? ` / ${d.candidate}` : ""}`; })()}.</>
                )}
              </Notice>
            </div>
          )}
        </form>

        {summary && (
          <div className="gv-stack" style={{ marginBottom: 16 }}>
            <div className="gv-card gv-stack">
              <div className="gv-grid-stats">
                <div className="gv-stat"><div className="k">Cast (all versions)</div><div className="v">{summary.counts.cast}</div></div>
                <div className="gv-stat"><div className="k">Counted</div><div className="v">{summary.counts.counted}</div></div>
                <div className="gv-stat"><div className="k">Superseded</div><div className="v">{summary.counts.superseded}</div></div>
                <div className="gv-stat"><div className="k">Audited</div><div className="v">{summary.counts.audited}</div></div>
              </div>
              <div className="gv-row">
                <Link className="gv-btn blue" to={`/verify?election=${eid}`}><ShieldCheck size={16} /> Verify this election</Link>
                <span className="gv-muted" style={{ fontSize: 13 }}>Tally: {summary.tally.status}</span>
              </div>
            </div>

            {/*
              Key material, trustees and the client-code hash matter to auditors,
              not to voters, so they sit collapsed (open for admins and trustees).
              They stay in the public board export — the verifier needs them.
            */}
            <details className="gv-card" open={me?.role === "admin" || !!me?.is_trustee} data-testid="technical-details">
              <summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", gap: 8, fontWeight: 900 }}>
                <KeyRound size={16} /> Technical details for auditors
                <span className="gv-muted" style={{ fontWeight: 500, fontSize: 13 }}>— election key, trustees, client code hash</span>
              </summary>
              <div className="gv-split" style={{ marginTop: 12 }}>
                <div className="gv-stack">
                  <div>
                    <div className="gv-row" style={{ gap: 6, fontWeight: 900 }}><KeyRound size={16} /> Election public key</div>
                    <div className="gv-mono gv-muted" style={{ fontSize: 12 }} data-testid="joint-key">{summary.election.joint_public_key ?? "not generated yet"}</div>
                  </div>
                  <div>
                    <div className="gv-row" style={{ gap: 6, fontWeight: 900 }}><Package size={16} /> Client crypto bundle (SHA-256)</div>
                    <div className="gv-mono gv-muted" style={{ fontSize: 12 }}>
                      {summary.client_bundle ? `${summary.client_bundle.file} · ${summary.client_bundle.sha256}` : "not recorded — run scripts/reproducible-build.sh"}
                    </div>
                    <div className="gv-muted" style={{ fontSize: 12 }}>Rebuild the app yourself and compare this hash to be sure the encryption code you ran is the published one.</div>
                  </div>
                </div>
                <div className="gv-stack" style={{ gap: 8 }}>
                  <div style={{ fontWeight: 900 }}>Trustees ({summary.election.threshold} of {summary.election.trustee_count} needed to decrypt)</div>
                  {summary.trustees.map((t) => (
                    <div key={t.trustee_index} style={{ borderTop: "1px solid var(--gov-edge)", paddingTop: 8 }}>
                      <div style={{ fontWeight: 800 }}>#{t.trustee_index} {t.name}</div>
                      <div className="gv-mono gv-muted" style={{ fontSize: 11 }}>share key {t.share_public_key ?? "pending"}</div>
                    </div>
                  ))}
                  {summary.tally.used_trustees.length > 0 && <div className="gv-muted" style={{ fontSize: 13 }}>Decrypted by trustees {summary.tally.used_trustees.join(", ")}</div>}
                </div>
              </div>
            </details>
          </div>
        )}

        <div className="gv-row" style={{ marginBottom: 10 }}>
          {(["cast", "audited"] as const).map((k) => (
            <button key={k} type="button" className={`gv-btn ${kind === k ? "gold" : ""}`} onClick={() => { setKind(k); setPage(1); }} style={{ minHeight: 44, padding: "8px 14px", fontSize: 14 }}>
              {k === "cast" ? "Cast ballots" : "Audited ballots"}
            </button>
          ))}
          <span className="gv-muted" style={{ fontSize: 13 }}>{rows?.total ?? 0} total</span>
        </div>

        <div className="gv-stack" style={{ gap: 10 }} data-testid="board-rows">
          {rows?.data.map((r) => (
            <details key={r.tracking_code} className="gv-card" style={{ padding: 14 }}>
              <summary style={{ cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", minHeight: 44 }}>
                <span className="gv-mono" style={{ fontWeight: 900 }}>{r.short_code}</span>
                <span className={`gv-pill ${STATUS_TONE[r.status]}`} style={{ margin: 0 }}>{r.status}</span>
                {r.sequence && <span className="gv-muted" style={{ fontSize: 12 }}>#{r.sequence}</span>}
              </summary>
              <div className="gv-stack" style={{ marginTop: 10, gap: 8, fontSize: 12 }}>
                <div className="gv-mono gv-muted">tracking hash {r.tracking_code}</div>
                {r.ballot && <div className="gv-mono gv-muted">credential (pseudonymous) {r.ballot.credential}</div>}
                <div className="gv-table-wrap">
                  <table className="gv-table" style={{ fontSize: 11 }}>
                    <thead><tr><th>#</th><th>Option</th><th>Ciphertext A</th><th>Ciphertext B</th></tr></thead>
                    <tbody>
                      {(r.ballot?.ciphertexts ?? r.audit?.ciphertexts ?? []).map((c, i) => {
                        const m = manifests.get((r.ballot ?? r.audit)!.manifest_id);
                        return (
                          <tr key={i}>
                            <td>{i}</td>
                            <td>{m?.options[i]?.label ?? "—"}{r.audit ? ` = ${r.audit.selections[i]}` : ""}</td>
                            <td className="gv-mono">{c.a}</td>
                            <td className="gv-mono">{c.b}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {r.ballot && (
                  <details>
                    <summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center" }}>Zero-knowledge proofs ({r.ballot.option_proofs.length + r.ballot.constraint_proofs.length})</summary>
                    <pre className="gv-mono" style={{ whiteSpace: "pre-wrap", fontSize: 10, maxHeight: 240, overflow: "auto" }}>
                      {JSON.stringify({ option_proofs: r.ballot.option_proofs, constraint_proofs: r.ballot.constraint_proofs }, null, 1)}
                    </pre>
                  </details>
                )}
              </div>
            </details>
          ))}
        </div>

        {rows && rows.last_page > 1 && (
          <div className="gv-row" style={{ marginTop: 12, justifyContent: "center" }}>
            <button className="gv-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="gv-muted">Page {page} of {rows.last_page}</span>
            <button className="gv-btn" disabled={page >= rows.last_page} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
