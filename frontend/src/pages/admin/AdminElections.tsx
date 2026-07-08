import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Settings2, MapPin, ChevronRight, Play, Square, FileEdit } from "lucide-react";
import AdminLayout from "./AdminLayout";
import {
  adminListElections,
  adminGetElection,
  adminCreateElection,
  adminSetElectionStatus,
  adminListConstituencies,
  adminSyncConstituencies,
  type AdminElection,
  type AdminConstituency,
} from "../../lib/api";

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  active: "#47a76f",
  closed: "#e5a23b",
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? "#94a3b8";
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
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

const emptyForm = {
  title: "",
  type: "parliamentary",
  law_ref: "Law 44/2017",
  starts_at: "",
  ends_at: "",
  description: "",
};

export default function AdminElections() {
  const nav = useNavigate();
  const [elections, setElections] = useState<AdminElection[]>([]);
  const [constituencies, setConstituencies] = useState<AdminConstituency[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [editConstFor, setEditConstFor] = useState<number | null>(null);
  const [selectedConsts, setSelectedConsts] = useState<Set<number>>(new Set());

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [el, co] = await Promise.all([
        adminListElections(),
        adminListConstituencies(),
      ]);
      setElections(el.elections);
      setConstituencies(co.constituencies);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createElection(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await adminCreateElection({ ...form, status: "draft" });
      setForm({ ...emptyForm });
      setShowForm(false);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(el: AdminElection, status: string) {
    setErr(null);
    try {
      await adminSetElectionStatus(el.id, status);
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  function openConstEditor(el: AdminElection) {
    setEditConstFor(el.id);
    setSelectedConsts(new Set((el.constituencies ?? []).map((c) => c.id)));
    // Fetch the election's currently-attached constituencies to pre-check them.
    adminGetElection(el.id)
      .then((d) =>
        setSelectedConsts(new Set((d.election.constituencies ?? []).map((c) => c.id)))
      )
      .catch(() => {});
  }

  async function saveConsts(electionId: number) {
    setErr(null);
    try {
      await adminSyncConstituencies(electionId, Array.from(selectedConsts));
      setEditConstFor(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  const field = (
    label: string,
    key: keyof typeof form,
    type = "text",
    required = true
  ) => (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gov-muted)" }}>
        {label}
      </span>
      <input
        className="govInput"
        type={type}
        required={required}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--gov-edge)",
          background: "var(--gov-card2, rgba(255,255,255,0.03))",
          color: "var(--gov-ink)",
        }}
      />
    </label>
  );

  return (
    <AdminLayout title="Elections">
      {err && <div className="govError" style={{ marginBottom: 14 }}>{err}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          className="govBtn govBtnGold"
          onClick={() => setShowForm((s) => !s)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", fontWeight: 800 }}
        >
          <Plus size={16} /> New election
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={createElection}
          style={{
            border: "1px solid var(--gov-edge)",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            background: "var(--gov-card)",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {field("Title", "title")}
            {field("Law reference", "law_ref", "text", false)}
            {field("Starts at", "starts_at", "datetime-local")}
            {field("Ends at", "ends_at", "datetime-local")}
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gov-muted)" }}>Type</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--gov-edge)",
                background: "var(--gov-card2, rgba(255,255,255,0.03))",
                color: "var(--gov-ink)",
              }}
            >
              <option value="parliamentary">Parliamentary</option>
              <option value="municipal">Municipal</option>
              <option value="other">Other</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="govBtn govBtnGold" disabled={saving} style={{ padding: "10px 18px", fontWeight: 800 }}>
              {saving ? "Creating…" : "Create election"}
            </button>
            <button type="button" className="govBtn" onClick={() => setShowForm(false)} style={{ padding: "10px 18px" }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ color: "var(--gov-muted)" }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {elections.map((el) => (
            <div
              key={el.id}
              style={{
                border: "1px solid var(--gov-edge)",
                borderRadius: 16,
                padding: 18,
                background: "var(--gov-card)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 900 }}>{el.title}</span>
                    <StatusBadge status={el.status} />
                  </div>
                  <div style={{ fontSize: 13, color: "var(--gov-muted)", marginTop: 6 }}>
                    {el.starts_at ? new Date(el.starts_at).toLocaleString() : "—"} →{" "}
                    {el.ends_at ? new Date(el.ends_at).toLocaleString() : "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--gov-muted)", marginTop: 4 }}>
                    {el.constituencies_count ?? 0} constituencies • {el.lists_count ?? 0} lists •{" "}
                    {el.encrypted_ballots_count ?? 0} ballots
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {el.status !== "active" && (
                    <button className="govBtn" onClick={() => setStatus(el, "active")} style={btn("#47a76f")}>
                      <Play size={14} /> Activate
                    </button>
                  )}
                  {el.status !== "closed" && (
                    <button className="govBtn" onClick={() => setStatus(el, "closed")} style={btn("#e5a23b")}>
                      <Square size={14} /> Close
                    </button>
                  )}
                  {el.status !== "draft" && (
                    <button className="govBtn" onClick={() => setStatus(el, "draft")} style={btn("#94a3b8")}>
                      <FileEdit size={14} /> Draft
                    </button>
                  )}
                  <button className="govBtn" onClick={() => openConstEditor(el)} style={btn()}>
                    <MapPin size={14} /> Constituencies
                  </button>
                  <button className="govBtn" onClick={() => nav(`/admin/elections/${el.id}`)} style={btn()}>
                    <Settings2 size={14} /> Lists & candidates <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {editConstFor === el.id && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid var(--gov-edge)",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                    Attach constituencies
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: 8,
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    {constituencies.map((c) => {
                      const checked = selectedConsts.has(c.id);
                      return (
                        <label
                          key={c.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13,
                            padding: "6px 8px",
                            borderRadius: 8,
                            cursor: "pointer",
                            background: checked ? "rgba(201,162,39,0.1)" : "transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(selectedConsts);
                              e.target.checked ? next.add(c.id) : next.delete(c.id);
                              setSelectedConsts(next);
                            }}
                          />
                          {c.name_en ?? c.code}
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button className="govBtn govBtnGold" onClick={() => saveConsts(el.id)} style={{ padding: "8px 16px", fontWeight: 800 }}>
                      Save ({selectedConsts.size})
                    </button>
                    <button className="govBtn" onClick={() => setEditConstFor(null)} style={{ padding: "8px 16px" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {elections.length === 0 && (
            <div style={{ color: "var(--gov-muted)" }}>No elections yet. Create one above.</div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

function btn(color?: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    ...(color ? { color, borderColor: `${color}55` } : {}),
  };
}
