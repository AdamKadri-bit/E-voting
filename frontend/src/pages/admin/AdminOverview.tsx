import { useEffect, useState } from "react";
import { Vote, Users, ListChecks, ShieldCheck, ShieldAlert, FileBox } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { adminOverview, adminListElections, type AdminElection } from "../../lib/api";
import { Card, Metric } from "../../components/common/Card";
import { ElectionStatusStepper, ElectionTimeProgress } from "../../components/admin/ElectionProgress";

type Overview = {
  counts: {
    elections: number;
    active_elections: number;
    lists: number;
    candidacies: number;
    ballots: number;
    voters: number;
  };
  chain: { valid: boolean; verified_ballots: number; message?: string };
};

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [activeElections, setActiveElections] = useState<AdminElection[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminOverview()
      .then((d) => setData(d as Overview))
      .catch((e) => setErr(e.message));
    adminListElections()
      .then((d) => setActiveElections(d.elections.filter((el) => el.status === "active")))
      .catch(() => {});
  }, []);

  return (
    <AdminLayout title="Overview">
      {err && <div className="govError">{err}</div>}
      {!data ? (
        <div style={{ color: "var(--gov-muted)" }}>Loading…</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <Card>
              <Metric
                icon={<Vote size={22} />}
                label="Elections"
                value={`${data.counts.elections} (${data.counts.active_elections} active)`}
              />
            </Card>
            <Card>
              <Metric icon={<ListChecks size={22} />} label="Lists" value={data.counts.lists} />
            </Card>
            <Card>
              <Metric icon={<Users size={22} />} label="Candidacies" value={data.counts.candidacies} />
            </Card>
            <Card>
              <Metric icon={<FileBox size={22} />} label="Ballots cast" value={data.counts.ballots} />
            </Card>
            <Card>
              <Metric icon={<Users size={22} />} label="Voters" value={data.counts.voters} />
            </Card>
          </div>

          <div style={{ marginTop: 20 }}>
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {data.chain.valid ? (
                  <ShieldCheck size={26} color="#47a76f" />
                ) : (
                  <ShieldAlert size={26} color="#e5484d" />
                )}
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    Ballot chain: {data.chain.valid ? "Verified" : "BROKEN"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--gov-muted)" }}>
                    {data.chain.message} • {data.chain.verified_ballots} ballot(s) checked
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {activeElections.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 900, margin: "0 0 12px" }}>Active elections</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {activeElections.map((el) => (
                  <Card key={el.id}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontWeight: 800 }}>{el.title}</span>
                      <ElectionStatusStepper status={el.status} />
                    </div>
                    <ElectionTimeProgress startsAt={el.starts_at} endsAt={el.ends_at} status={el.status} />
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
