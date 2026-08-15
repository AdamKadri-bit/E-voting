import { useEffect, useState } from "react";
import {
  Vote,
  Users,
  ListChecks,
  ShieldCheck,
  ShieldAlert,
  FileBox,
  MapPin,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import {
  adminOverview,
  adminElectionOverview,
  type ElectionOverview,
  type OverviewElection,
} from "../../lib/api";
import { Card, Metric } from "../../components/common/Card";
import { ElectionStatusStepper, ElectionTimeProgress } from "../../components/admin/ElectionProgress";
import { STATUS_COLORS } from "../../components/admin/statusColors";

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? "#94a3b8";
  return (
    <span
      style={{
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        color: c,
        background: `${c}22`,
        border: `1px solid ${c}55`,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

function fmt(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

/** The election list — the only thing shown until one is selected. */
function ElectionPicker({
  elections,
  selected,
  onSelect,
}: {
  elections: OverviewElection[];
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {elections.map((el) => {
        const isSelected = el.id === selected;
        return (
          <div
            key={el.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(el.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(el.id);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              padding: "14px 16px",
              borderRadius: 14,
              cursor: "pointer",
              border: isSelected
                ? "1px solid rgba(201,162,39,0.55)"
                : "1px solid var(--gov-edge)",
              background: isSelected ? "rgba(201,162,39,0.10)" : "var(--gov-card)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800 }}>{el.title}</span>
                <StatusBadge status={el.status} />
              </div>
              <div style={{ fontSize: 12, color: "var(--gov-muted)", marginTop: 5 }}>
                {fmt(el.starts_at)} → {fmt(el.ends_at)}
              </div>
            </div>
            <ChevronRight size={18} color="var(--gov-muted)" />
          </div>
        );
      })}
      {elections.length === 0 && (
        <div style={{ color: "var(--gov-muted)" }}>
          No elections yet. Create one from the Elections page.
        </div>
      )}
    </div>
  );
}

/** Activation checklist: what still has to be done before voting can open. */
function ReadinessPanel({ data }: { data: ElectionOverview }) {
  const { readiness } = data;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        {readiness.ready ? (
          <ShieldCheck size={22} color="#47a76f" />
        ) : (
          <ShieldAlert size={22} color="#e5a23b" />
        )}
        <div style={{ fontWeight: 900, fontSize: 15 }}>
          {readiness.ready
            ? "Complete — this election can be activated"
            : "Incomplete — activation is blocked"}
        </div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {readiness.checks.map((check) => (
          <div key={check.key} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            {check.passed ? (
              <Check size={16} color="#47a76f" style={{ marginTop: 2, flexShrink: 0 }} />
            ) : (
              <X size={16} color="#e5484d" style={{ marginTop: 2, flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{check.label}</div>
              <div style={{ fontSize: 12, color: "var(--gov-muted)" }}>{check.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function AdminOverview() {
  const [elections, setElections] = useState<OverviewElection[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [data, setData] = useState<ElectionOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    adminOverview()
      .then((d) => {
        setElections(d.elections);
        // Land on the election that is actually running, if there is one.
        const active = d.elections.find((el) => el.status === "active");
        setSelected((active ?? d.elections[0])?.id ?? null);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    if (selected == null) return;
    setData(null);
    setErr(null);
    adminElectionOverview(selected)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [selected]);

  return (
    <AdminLayout title="Overview">
      {err && <div className="govError" style={{ marginBottom: 14 }}>{err}</div>}

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, margin: "0 0 12px" }}>
          Select an election
        </h2>
        {loadingList ? (
          <div style={{ color: "var(--gov-muted)" }}>Loading…</div>
        ) : (
          <ElectionPicker elections={elections} selected={selected} onSelect={setSelected} />
        )}
      </div>

      {selected != null && (
        !data ? (
          <div style={{ color: "var(--gov-muted)" }}>Loading election…</div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {/* The selected election's own data. */}
            <Card>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{data.election.title}</div>
                  <div style={{ fontSize: 12, color: "var(--gov-muted)", marginTop: 4 }}>
                    {data.election.type} • {data.election.law_ref ?? "—"}
                  </div>
                </div>
                <ElectionStatusStepper status={data.election.status} />
              </div>

              <div style={{ fontSize: 13, color: "var(--gov-muted)", marginBottom: 10 }}>
                {fmt(data.election.starts_at)} → {fmt(data.election.ends_at)}
              </div>

              <ElectionTimeProgress
                startsAt={data.election.starts_at}
                endsAt={data.election.ends_at}
                status={data.election.status}
              />

              {data.election.statutory_ends_at && (
                <div style={{ fontSize: 12, color: "var(--gov-muted)", marginTop: 10 }}>
                  Statutory close under {data.election.statutory_law_ref ?? "the election law"}:{" "}
                  {fmt(data.election.statutory_ends_at)}
                  {data.election.ends_at !== data.election.statutory_ends_at &&
                    " — this election's end time was set manually."}
                </div>
              )}

              {data.election.description && (
                <p style={{ fontSize: 13, color: "var(--gov-muted)", margin: "10px 0 0" }}>
                  {data.election.description}
                </p>
              )}
            </Card>

            {/* Its figures. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                gap: 16,
              }}
            >
              <Card>
                <Metric
                  icon={<MapPin size={22} />}
                  label="Constituencies"
                  value={data.counts.constituencies}
                />
              </Card>
              <Card>
                <Metric icon={<ListChecks size={22} />} label="Lists" value={data.counts.lists} />
              </Card>
              <Card>
                <Metric
                  icon={<Users size={22} />}
                  label="Candidacies"
                  value={data.counts.candidacies}
                  subtext={`${data.counts.candidacies_accepted} accepted • ${data.counts.candidacies_pending} pending`}
                />
              </Card>
              <Card>
                <Metric icon={<FileBox size={22} />} label="Ballots cast" value={data.counts.ballots} />
              </Card>
              <Card>
                <Metric
                  icon={<Users size={22} />}
                  label="Registered voters"
                  value={data.turnout.registered}
                />
              </Card>
              <Card>
                <Metric
                  icon={<Vote size={22} />}
                  label="Turnout"
                  value={`${data.turnout.turnout_percentage}%`}
                  subtext={`${data.turnout.voted} of ${data.turnout.registered} voted`}
                />
              </Card>
            </div>

            <ReadinessPanel data={data} />

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
        )
      )}
    </AdminLayout>
  );
}
