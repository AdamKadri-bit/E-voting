import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, CheckCircle2, XCircle, MinusCircle, Download, Upload, Terminal } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import PageHeader from "../components/common/PageHeader";
import Notice from "../components/common/Notice";
import ProgressBar from "../components/common/ProgressBar";
import { boardElections, boardExport, type BoardElection } from "../lib/api";
import { runCrypto } from "../crypto/client";
import type { VerifierReport } from "../crypto/verifier";
import type { BoardExport } from "../crypto/board";
import { downloadText } from "../lib/download";
import { useMe } from "../lib/useMe";
import { errorMessage } from "../lib/errors";

/**
 * Independent verifier, entirely in this browser: downloads the public board
 * (or reads a saved copy) and re-checks every proof and the tally. It trusts
 * nothing the server computed.
 */
export default function VerifierPage() {
  const [params, setParams] = useSearchParams();
  const { me } = useMe();
  const [elections, setElections] = useState<BoardElection[]>([]);
  const [eid, setEid] = useState<number | null>(params.get("election") ? Number(params.get("election")) : null);
  const [progress, setProgress] = useState<{ p: number; label: string } | null>(null);
  const [report, setReport] = useState<VerifierReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    boardElections().then((r) => setElections(r.elections)).catch(() => {});
  }, []);

  async function run(board?: BoardExport) {
    setErr(null);
    setReport(null);
    setProgress({ p: 0, label: "Downloading the bulletin board" });
    const t0 = performance.now();
    try {
      const b = board ?? (await boardExport(eid!));
      const r = await runCrypto<VerifierReport>("verifyBoard", { board: b }, (p, label) => setProgress({ p, label: label ?? "Verifying" }));
      setReport(r);
      setMs(Math.round(performance.now() - t0));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setProgress(null);
    }
  }

  useEffect(() => {
    if (eid && params.get("auto") !== "0") run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardLayout isGuest={!me} userEmail={me?.email}>
      <div className="gv-page" style={{ maxWidth: 900 }}>
        <PageHeader pill={<><ShieldCheck size={14} /> Independent verifier</>} pillTone="blue" title="Verify an election">
          Runs entirely in your browser. It checks every ballot's zero-knowledge proof, that only each voter's last ballot counts, that audited ballots match, that the tally is the sum of the counted ballots, and that the trustees' decryptions are proven and match the published results.
        </PageHeader>

        <div className="gv-card gv-stack" style={{ marginBottom: 16 }}>
          <label className="govLabel">
            <span>Election</span>
            <select
              className="govInput"
              value={eid ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                setEid(v);
                setParams(v ? { election: String(v), auto: "0" } : {});
              }}
              data-testid="verify-election"
            >
              <option value="">Choose an election…</option>
              {elections.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </label>
          <div className="gv-row">
            <button type="button" className="gv-btn blue" disabled={!eid || !!progress} onClick={() => run()} data-testid="run-verifier">
              <ShieldCheck size={16} /> Run verifier
            </button>
            <label className="gv-btn" style={{ cursor: "pointer" }}>
              <Upload size={16} /> Verify a saved board file
              <input
                type="file"
                accept="application/json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) run(JSON.parse(await f.text()));
                }}
              />
            </label>
          </div>
        </div>

        {progress && <div className="gv-card" style={{ marginBottom: 16 }}><ProgressBar value={progress.p} label={progress.label} /></div>}
        {err && <Notice kind="error">{err}</Notice>}

        {report && (
          <div className="gv-stack" data-testid="verifier-report" data-ok={report.ok}>
            <Notice kind={report.ok ? "ok" : "error"}>
              <strong style={{ fontSize: 18 }}>{report.ok ? "PASS — the election checks out." : "FAIL — something doesn't add up."}</strong>
              {ms !== null && <span className="gv-muted"> ({ms} ms)</span>}
            </Notice>
            {report.checks.map((c) => (
              <div key={c.id} className="gv-card" style={{ padding: 14 }} data-check={c.id} data-ok={c.ok}>
                <div className="gv-row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                  {c.skipped ? <MinusCircle size={20} color="#94a3b8" /> : c.ok ? <CheckCircle2 size={20} color="#47a76f" /> : <XCircle size={20} color="#f87171" />}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900 }}>{c.name}</div>
                    <div className="gv-muted" style={{ fontSize: 13 }}>{c.detail}</div>
                    {c.failures.map((f) => (
                      <div key={f} className="gv-mono" style={{ fontSize: 12, color: "#f87171" }}>· {f}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div className="gv-row">
              <button type="button" className="gv-btn" onClick={() => downloadText(`verifier-report-election-${report.election_id}.json`, JSON.stringify(report, null, 2))}>
                <Download size={16} /> Download report
              </button>
              {eid && <Link className="gv-btn" to={`/board/${eid}`}>Open the board</Link>}
            </div>
          </div>
        )}

        <div className="gv-card" style={{ marginTop: 18 }}>
          <div className="gv-row" style={{ gap: 6, fontWeight: 900 }}><Terminal size={16} /> Prefer the command line?</div>
          <pre className="gv-mono" style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>cd frontend && npm run verify -- --election {eid ?? "<id>"} --api {import.meta.env.VITE_API_URL ?? "http://localhost:8001/api"}</pre>
        </div>
      </div>
    </DashboardLayout>
  );
}
