import { useEffect, useState } from "react";
import { Vote, Users, ListChecks, ShieldCheck, ShieldAlert, FileBox } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { adminOverview } from "../../lib/api";

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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--gov-edge)",
        borderRadius: 16,
        padding: 18,
        background: "var(--gov-card)",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--gov-edge)",
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: "var(--gov-muted)", fontWeight: 700 }}>
          {label}
        </div>
        <div style={{ fontSize: 24, fontWeight: 900 }}>{value}</div>
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminOverview()
      .then((d) => setData(d as Overview))
      .catch((e) => setErr(e.message));
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
            <StatCard
              icon={<Vote size={22} />}
              label="Elections"
              value={`${data.counts.elections} (${data.counts.active_elections} active)`}
            />
            <StatCard icon={<ListChecks size={22} />} label="Lists" value={data.counts.lists} />
            <StatCard icon={<Users size={22} />} label="Candidacies" value={data.counts.candidacies} />
            <StatCard icon={<FileBox size={22} />} label="Ballots cast" value={data.counts.ballots} />
            <StatCard icon={<Users size={22} />} label="Voters" value={data.counts.voters} />
          </div>

          <div
            style={{
              marginTop: 20,
              border: "1px solid var(--gov-edge)",
              borderRadius: 16,
              padding: 20,
              background: "var(--gov-card)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
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
        </>
      )}
    </AdminLayout>
  );
}
