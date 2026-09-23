import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Vote, CalendarDays, ShieldCheck, ChevronRight, Plane, BarChart3, ListChecks } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import PageHeader from "../components/common/PageHeader";
import Notice from "../components/common/Notice";
import { listVoterElections, type VoterElection } from "../lib/api";
import { useMe } from "../lib/useMe";

/** Elections the signed-in voter can see: open ones to vote in, closed ones to check. */
export default function ElectionsPage() {
  const nav = useNavigate();
  const { me } = useMe();
  const [elections, setElections] = useState<VoterElection[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listVoterElections()
      .then((r) => setElections(r.elections))
      .catch((e) => setErr(e.message));
  }, []);

  const diaspora = me?.voter_status.voter_type === "diaspora";

  return (
    <DashboardLayout userEmail={me?.email}>
      <div className="gv-page">
        <PageHeader pill={<><ShieldCheck size={14} /> Elections</>} pillTone="green" title="Elections">
          Open an election to cast an end-to-end encrypted ballot. You can change your vote until polling closes — only your last ballot counts.
        </PageHeader>

        {diaspora && (
          <div style={{ marginBottom: 16 }}>
            <Notice kind="info">
              <Plane size={14} style={{ verticalAlign: -2 }} /> You're voting from the diaspora ({me?.voter_status.residence_country_name}). You'll get your home district's ballot.
            </Notice>
          </div>
        )}
        {err && <Notice kind="error">{err}</Notice>}
        {!elections && !err && <div className="gv-muted">Loading elections…</div>}
        {elections?.length === 0 && <Notice>No elections are open or published right now.</Notice>}

        <div className="gv-grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
          {elections?.map((e) => {
            const canVote = e.is_open && e.eligible && e.verified && e.crypto_scheme === "e2e" && e.key_ready && (!diaspora || e.diaspora_voting_enabled);
            return (
              <div key={e.id} className="gv-card gv-stack" data-testid={`election-${e.id}`}>
                <div className="gv-row" style={{ justifyContent: "space-between" }}>
                  <span className={`gv-pill ${e.is_open ? "green" : ""}`} style={{ margin: 0 }}>
                    {e.is_open ? "Open" : e.tally_status === "published" ? "Results published" : e.status === "closed" ? "Closed" : "Scheduled"}
                  </span>
                  {e.has_voted && <span className="gv-pill blue" style={{ margin: 0 }}>You voted</span>}
                </div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 900 }}>{e.title}</div>
                  <div className="gv-muted gv-row" style={{ fontSize: 13, marginTop: 6, gap: 6 }}>
                    <CalendarDays size={14} />
                    {e.starts_at ? new Date(e.starts_at).toLocaleString() : "—"} → {e.ends_at ? new Date(e.ends_at).toLocaleString() : "—"}
                  </div>
                </div>

                {e.is_open && diaspora && !e.diaspora_voting_enabled && (
                  <Notice kind="warn">Diaspora voting is not available for this election.</Notice>
                )}
                {e.is_open && e.eligible && !e.verified && (
                  <Notice kind="warn">
                    Verify your identity against the voter registry before voting. <Link to="/verify-voter">Verify Voter Record</Link>
                  </Notice>
                )}
                {e.is_open && !e.eligible && <Notice kind="warn">You're not on this election's electoral roll.</Notice>}

                <div className="gv-row">
                  {canVote && (
                    <button type="button" className="gv-btn primary" onClick={() => nav(`/elections/${e.id}/ballot`)} data-testid={`vote-${e.id}`}>
                      <Vote size={16} /> {e.has_voted ? "Change my vote" : diaspora ? "Open diaspora ballot" : "Open ballot"} <ChevronRight size={16} />
                    </button>
                  )}
                  {e.crypto_scheme === "e2e" && e.key_ready && (
                    <>
                      <Link className="gv-btn" to={`/results/${e.id}`}><BarChart3 size={16} /> {e.tally_status === "published" ? "Results" : "Turnout"}</Link>
                      <Link className="gv-btn" to={`/board/${e.id}`}><ListChecks size={16} /> Bulletin board</Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
