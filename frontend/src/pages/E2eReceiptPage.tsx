import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Receipt, Download, ListChecks, ShieldCheck, RefreshCw } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import PageHeader from "../components/common/PageHeader";
import Notice from "../components/common/Notice";
import TrackingCode from "../components/common/TrackingCode";
import { boardLookup, type BoardRow, type CastReceipt } from "../lib/api";
import { downloadText } from "../lib/download";

/**
 * Voter receipt for an encrypted ballot. It proves the ballot is on the board
 * (inclusion) — not how it was cast — so it can't be used to sell a vote.
 */
export default function E2eReceiptPage() {
  const { electionId, code } = useParams();
  const eid = Number(electionId);
  const loc = useLocation();
  const receipt = (loc.state as any)?.receipt as CastReceipt | undefined;
  const [row, setRow] = useState<BoardRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    boardLookup(eid, code ?? "").then(setRow).catch((e) => setErr(e.message));
  }, [eid, code]);

  const short = receipt?.short_code ?? row?.short_code ?? code ?? "";
  const full = receipt?.tracking_code ?? row?.tracking_code;
  const boardUrl = `${window.location.origin}/board/${eid}?code=${short}`;

  function download() {
    downloadText(
      `ballot-receipt-${short}.txt`,
      [
        "Lebanon Secure E-Voting — ballot receipt",
        `Election: ${receipt?.election_title ?? `#${eid}`}`,
        `Tracking code: ${short}`,
        `Full tracking hash: ${full ?? "(see bulletin board)"}`,
        `Ballot style (manifest) hash: ${receipt?.manifest_hash ?? "—"}`,
        `Check it on the public bulletin board: ${boardUrl}`,
        "",
        "This receipt shows your encrypted ballot is on the board. It does not reveal your vote.",
        "You can vote again until polling closes; only your last ballot counts.",
      ].join("\n"),
      "text/plain"
    );
  }

  return (
    <DashboardLayout>
      <div className="gv-page" style={{ maxWidth: 760 }}>
        <PageHeader pill={<><Receipt size={14} /> Receipt</>} pillTone="green" title="Your ballot was cast">
          {receipt?.election_title}
        </PageHeader>

        <div className="gv-stack">
          <div className="gv-card gv-stack" data-testid="receipt">
            <div className="gv-muted" style={{ fontSize: 13 }}>Tracking code</div>
            <TrackingCode short={short} full={full} shareUrl={boardUrl} />
            <div className="gv-row">
              <button type="button" className="gv-btn" onClick={download}><Download size={16} /> Download receipt</button>
              <Link className="gv-btn" to={`/board/${eid}?code=${short}`}><ListChecks size={16} /> Find it on the board</Link>
            </div>
          </div>

          {row && (
            <Notice kind="ok">
              <ShieldCheck size={14} style={{ verticalAlign: -2 }} /> On the public bulletin board now, status <strong data-testid="receipt-status">{row.status}</strong>.
            </Notice>
          )}
          {err && <Notice kind="warn">{err}</Notice>}
          {receipt?.replaces_previous && <Notice>This ballot replaces your earlier one, which is now marked “superseded” on the board.</Notice>}

          <Notice kind="info">
            <RefreshCw size={14} style={{ verticalAlign: -2 }} /> You can change your vote until the election closes. Only your last vote counts. The receipt proves your ballot is included — not what's in it.
          </Notice>

          <div className="gv-row">
            <Link className="gv-btn primary" to="/dashboard">Done</Link>
            <Link className="gv-btn" to={`/results/${eid}`}>Live turnout</Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
