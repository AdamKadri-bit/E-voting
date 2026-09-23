import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks, ChevronRight } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import PageHeader from "../components/common/PageHeader";
import Notice from "../components/common/Notice";
import { boardElections, type BoardElection } from "../lib/api";
import { useMe } from "../lib/useMe";

/** Public list of every end-to-end verifiable election's bulletin board. */
export default function BoardIndexPage() {
  const { me } = useMe();
  const [rows, setRows] = useState<BoardElection[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    boardElections().then((r) => setRows(r.elections)).catch((e) => setErr(e.message));
  }, []);

  return (
    <DashboardLayout isGuest={!me} userEmail={me?.email}>
      <div className="gv-page">
        <PageHeader pill={<><ListChecks size={14} /> Public bulletin board</>} title="Bulletin boards">
          Every encrypted ballot, its proofs, the election key and the trustees' decryption proofs — published so anyone can check the election.
        </PageHeader>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="gv-grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}>
          {rows?.map((e) => (
            <Link key={e.id} to={`/board/${e.id}`} className="gv-card" style={{ textDecoration: "none", color: "inherit", display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 900, fontSize: 17 }}>{e.title}</div>
              <div className="gv-muted" style={{ fontSize: 13 }}>
                {e.status} · keys {e.key_ceremony_status} · tally {e.tally_status}
              </div>
              <div className="gv-row" style={{ color: "var(--gov-gold)", fontWeight: 800 }}>Open board <ChevronRight size={16} /></div>
            </Link>
          ))}
        </div>
        {rows?.length === 0 && <Notice>No public boards yet.</Notice>}
      </div>
    </DashboardLayout>
  );
}
