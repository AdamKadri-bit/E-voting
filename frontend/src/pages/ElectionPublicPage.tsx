import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BarChart3, ShieldCheck, Loader2, TriangleAlert } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import PageHeader from "../components/common/PageHeader";
import Notice from "../components/common/Notice";
import TurnoutPanel from "../components/analytics/TurnoutPanel";
import { boardExport, publicResults, publicTurnout, type PublicResults } from "../lib/api";
import { runCrypto } from "../crypto/client";
import type { VerifierReport } from "../crypto/verifier";
import { useMe } from "../lib/useMe";

/**
 * Public election page: live turnout and the participation map while polls
 * are open (no results — there are none to show), then the decrypted results
 * with a "Verified ✓" badge earned by running the verifier in this browser.
 */
export default function ElectionPublicPage() {
  const { electionId } = useParams();
  const eid = Number(electionId);
  const { me } = useMe();
  const [results, setResults] = useState<PublicResults | null>(null);
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState<"running" | "pass" | "fail" | null>(null);
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    // Ask for results only once the tally is published — before that there are none.
    publicTurnout(eid)
      .then((t) => {
        setTitle(t.election.title);
        if (t.election.tally_status !== "published") {
          setPending(true);
          return;
        }
        return publicResults(eid).then((r) => {
          setResults(r);
          setVerified("running");
          return boardExport(eid)
            .then((b) => runCrypto<VerifierReport>("verifyBoard", { board: b }))
            .then((rep) => setVerified(rep.ok ? "pass" : "fail"))
            .catch(() => setVerified("fail"));
        });
      })
      .catch(() => setPending(true));
  }, [eid]);

  const totalVotes = results?.lists.reduce((a, l) => a + l.votes, 0) ?? 0;

  return (
    <DashboardLayout isGuest={!me} userEmail={me?.email}>
      <div className="gv-page">
        <PageHeader pill={<><BarChart3 size={14} /> {results ? "Results" : "Live turnout"}</>} title={results?.election.title ?? title ?? "Election turnout"}>
          {results ? "Decrypted by the trustees from the homomorphic tally — no individual ballot was ever opened." : "Who has voted so far and from where. Results stay encrypted until the trustees decrypt the tally after polling closes."}
        </PageHeader>

        {results && (
          <div className="gv-card gv-stack" style={{ marginBottom: 18 }} data-testid="results">
            <div className="gv-row" style={{ justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Results</div>
              <Link to={`/verify?election=${eid}`} className={`gv-pill ${verified === "pass" ? "green" : verified === "fail" ? "" : "blue"}`} style={{ margin: 0, textDecoration: "none" }} data-testid="verified-badge" data-state={verified ?? ""}>
                {verified === "pass" && <><ShieldCheck size={14} /> Verified ✓</>}
                {verified === "running" && <><Loader2 size={14} /> Verifying in your browser…</>}
                {verified === "fail" && <><TriangleAlert size={14} /> Verification failed — see details</>}
              </Link>
            </div>
            <div className="gv-stack" style={{ gap: 10 }}>
              {results.lists.map((l) => (
                <div key={l.list_id}>
                  <div className="gv-row" style={{ justifyContent: "space-between" }}>
                    <strong>{l.list_name}</strong>
                    <span>{l.votes.toLocaleString()} · {l.percentage}%</span>
                  </div>
                  <div className="gv-progress" style={{ marginTop: 4 }}><div style={{ width: `${totalVotes ? (l.votes / totalVotes) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
            {results.preferential_candidates.length > 0 && (
              <div className="gv-table-wrap">
                <table className="gv-table">
                  <thead><tr><th>Preferential votes</th><th>Votes</th></tr></thead>
                  <tbody>
                    {results.preferential_candidates.map((c) => (
                      <tr key={c.candidacy_id}><td>{c.candidate_name}</td><td>{c.votes}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {pending && !results && (
          <div style={{ marginBottom: 16 }}>
            <Notice kind="info">Results are not available until the trustees decrypt the tally after polling closes.</Notice>
          </div>
        )}

        <TurnoutPanel electionId={eid} />
      </div>
    </DashboardLayout>
  );
}
