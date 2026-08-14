import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, UserPlus, X } from "lucide-react";
import AdminLayout from "./AdminLayout";
import {
  adminGetElection,
  adminListLists,
  adminCreateList,
  adminDeleteList,
  adminListCandidacies,
  adminCreateCandidacy,
  adminAvailableCandidacies,
  adminAddCandidate,
  adminRemoveCandidate,
  type AdminElection,
  type AdminConstituency,
} from "../../lib/api";

export default function AdminElectionDetail() {
  const { electionId } = useParams();
  const eid = Number(electionId);

  const [election, setElection] = useState<AdminElection | null>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [candidacies, setCandidacies] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const consts: AdminConstituency[] = election?.constituencies ?? [];

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [e, l, c] = await Promise.all([
        adminGetElection(eid),
        adminListLists(eid),
        adminListCandidacies(eid),
      ]);
      setElection(e.election);
      setLists(l.lists);
      setCandidacies(c.candidacies);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eid]);

  return (
    <AdminLayout title={election ? election.title : "Election"}>
      {err && <div className="govError" style={{ marginBottom: 14 }}>{err}</div>}
      {loading ? (
        <div style={{ color: "var(--gov-muted)" }}>Loading…</div>
      ) : !election ? (
        <div style={{ color: "var(--gov-muted)" }}>Election not found.</div>
      ) : consts.length === 0 ? (
        <div className="govError">
          Attach at least one constituency to this election first (Elections →
          Constituencies).
        </div>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          <CandidacySection eid={eid} consts={consts} onChange={load} candidacies={candidacies} />
          <ListsSection eid={eid} consts={consts} lists={lists} onChange={load} />
        </div>
      )}
    </AdminLayout>
  );
}

function sectionStyle(): React.CSSProperties {
  return {
    border: "1px solid var(--gov-edge)",
    borderRadius: 16,
    padding: 20,
    background: "var(--gov-card)",
  };
}
function inputStyle(): React.CSSProperties {
  return {
    padding: "9px 11px",
    borderRadius: 10,
    border: "1px solid var(--gov-edge)",
    background: "var(--gov-card2, rgba(255,255,255,0.03))",
    color: "var(--gov-ink)",
    fontSize: 13,
  };
}

/* ----- Candidacies ----- */
function CandidacySection({
  eid,
  consts,
  candidacies,
  onChange,
}: {
  eid: number;
  consts: AdminConstituency[];
  candidacies: any[];
  onChange: () => void;
}) {
  const [f, setF] = useState({
    national_id_number: "",
    full_name: "",
    full_name_ar: "",
    date_of_birth: "",
    constituency_id: consts[0]?.id ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await adminCreateCandidacy(eid, { ...f, constituency_id: Number(f.constituency_id) });
      setF({ ...f, national_id_number: "", full_name: "", full_name_ar: "", date_of_birth: "" });
      onChange();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={sectionStyle()}>
      <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 900 }}>
        Candidates ({candidacies.length})
      </h2>
      {err && <div className="govError" style={{ marginBottom: 10 }}>{err}</div>}
      <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, alignItems: "end" }}>
        <input style={inputStyle()} placeholder="National ID" required value={f.national_id_number} onChange={(e) => setF({ ...f, national_id_number: e.target.value })} />
        <input style={inputStyle()} placeholder="Full name (EN)" required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        <input style={inputStyle()} placeholder="Full name (AR)" value={f.full_name_ar} onChange={(e) => setF({ ...f, full_name_ar: e.target.value })} />
        <input style={inputStyle()} type="date" required value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} />
        <select style={inputStyle()} value={f.constituency_id} onChange={(e) => setF({ ...f, constituency_id: Number(e.target.value) })}>
          {consts.map((c) => (
            <option key={c.id} value={c.id}>{c.name_en ?? c.code}</option>
          ))}
        </select>
        <button className="govBtn govBtnGold" disabled={busy} style={{ gridColumn: "1 / -1", justifySelf: "start", padding: "9px 16px", fontWeight: 800, display: "inline-flex", gap: 6, alignItems: "center" }}>
          <UserPlus size={15} /> {busy ? "Adding…" : "Register candidate"}
        </button>
      </form>

      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {candidacies.map((c) => (
          <span key={c.id} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 999, border: "1px solid var(--gov-edge)", background: "rgba(255,255,255,0.03)" }}>
            {c.candidate_profile?.full_name ?? `#${c.id}`}
            <span style={{ color: "var(--gov-muted)", marginLeft: 6 }}>
              {c.constituency?.name_en ?? ""}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ----- Lists ----- */
function ListsSection({
  eid,
  consts,
  lists,
  onChange,
}: {
  eid: number;
  consts: AdminConstituency[];
  lists: any[];
  onChange: () => void;
}) {
  const [f, setF] = useState({
    list_name_en: "",
    list_name_ar: "",
    list_code: "",
    constituency_id: consts[0]?.id ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await adminCreateList(eid, {
        constituency_id: Number(f.constituency_id),
        list_name_en: f.list_name_en,
        list_name_ar: f.list_name_ar || null,
        list_code: f.list_code || null,
      });
      setF({ ...f, list_name_en: "", list_name_ar: "", list_code: "" });
      onChange();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={sectionStyle()}>
      <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 900 }}>Lists ({lists.length})</h2>
      {err && <div className="govError" style={{ marginBottom: 10 }}>{err}</div>}
      <form onSubmit={createList} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) auto", gap: 10, alignItems: "end", marginBottom: 18 }}>
        <input style={inputStyle()} placeholder="List name (EN)" required value={f.list_name_en} onChange={(e) => setF({ ...f, list_name_en: e.target.value })} />
        <input style={inputStyle()} placeholder="List name (AR)" value={f.list_name_ar} onChange={(e) => setF({ ...f, list_name_ar: e.target.value })} />
        <input style={inputStyle()} placeholder="Code" value={f.list_code} onChange={(e) => setF({ ...f, list_code: e.target.value })} />
        <select style={inputStyle()} value={f.constituency_id} onChange={(e) => setF({ ...f, constituency_id: Number(e.target.value) })}>
          {consts.map((c) => (
            <option key={c.id} value={c.id}>{c.name_en ?? c.code}</option>
          ))}
        </select>
        <button className="govBtn govBtnGold" disabled={busy} style={{ padding: "9px 16px", fontWeight: 800, display: "inline-flex", gap: 6, alignItems: "center" }}>
          <Plus size={15} /> Add list
        </button>
      </form>

      <div style={{ display: "grid", gap: 12 }}>
        {lists.map((l) => (
          <ListCard key={l.id} list={l} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

function ListCard({ list, onChange }: { list: any; onChange: () => void }) {
  const [available, setAvailable] = useState<any[]>([]);
  const [picked, setPicked] = useState<number | "">("");
  const [err, setErr] = useState<string | null>(null);

  async function loadAvailable() {
    try {
      const d = await adminAvailableCandidacies(list.id);
      setAvailable(d.candidacies);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    loadAvailable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  async function add() {
    if (!picked) return;
    setErr(null);
    try {
      await adminAddCandidate(list.id, { candidacy_id: Number(picked) });
      setPicked("");
      onChange();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function remove(lcId: number) {
    setErr(null);
    try {
      await adminRemoveCandidate(list.id, lcId);
      onChange();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function del() {
    if (!confirm(`Delete list "${list.list_name_en ?? list.list_name}"?`)) return;
    setErr(null);
    try {
      await adminDeleteList(list.id);
      onChange();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  const members = list.list_candidates ?? [];

  return (
    <div style={{ border: "1px solid var(--gov-edge)", borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <span style={{ fontWeight: 800 }}>{list.list_name_en ?? list.list_name}</span>
          <span style={{ color: "var(--gov-muted)", fontSize: 12, marginLeft: 8 }}>
            {list.constituency?.name_en ?? ""} • {members.length} candidate(s)
          </span>
        </div>
        <button className="govBtn" onClick={del} style={{ padding: "6px 10px", color: "#e5484d", borderColor: "#e5484d55" }}>
          <Trash2 size={14} />
        </button>
      </div>

      {err && <div className="govError" style={{ marginTop: 8 }}>{err}</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {members.map((m: any) => (
          <span key={m.id} style={{ fontSize: 12, padding: "4px 8px 4px 10px", borderRadius: 999, border: "1px solid var(--gov-edge)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {m.candidacy?.candidate_profile?.full_name ?? `#${m.candidacy_id}`}
            <button onClick={() => remove(m.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--gov-muted)", padding: 0, display: "inline-flex" }}>
              <X size={13} />
            </button>
          </span>
        ))}
        {members.length === 0 && <span style={{ fontSize: 12, color: "var(--gov-muted)" }}>No candidates yet.</span>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <select value={picked} onChange={(e) => setPicked(e.target.value ? Number(e.target.value) : "")} style={{ ...inputStyle(), flex: 1, maxWidth: 320 }}>
          <option value="">Add candidate…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.candidate_profile?.full_name ?? `Candidacy #${c.id}`}
            </option>
          ))}
        </select>
        <button className="govBtn" onClick={add} disabled={!picked} style={{ padding: "8px 14px", display: "inline-flex", gap: 6, alignItems: "center" }}>
          <UserPlus size={14} /> Add
        </button>
      </div>
    </div>
  );
}
