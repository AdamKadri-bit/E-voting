import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, Check, AlertTriangle, Download } from "lucide-react";
import {
  adminImportPreview,
  adminImportCommit,
  adminImportTemplateUrl,
  adminExportUrl,
  type ImportPreview,
  type ImportResult,
} from "../../lib/api";

const COLUMNS = [
  "constituency",
  "list_name_en",
  "candidate_name",
  "national_id",
  "date_of_birth",
];

function sectionStyle(): React.CSSProperties {
  return {
    border: "1px solid var(--gov-edge)",
    borderRadius: 16,
    padding: 20,
    background: "var(--gov-card)",
  };
}

function linkButton(): React.CSSProperties {
  return {
    padding: "8px 12px",
    fontSize: 13,
    textDecoration: "none",
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
  };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: "1px solid var(--gov-edge)",
        borderRadius: 10,
        padding: "8px 12px",
        minWidth: 110,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--gov-muted)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

/**
 * Upload an .xlsx/.csv of candidates for one election: the file is validated
 * and shown as a plan first, and only imported once the admin confirms.
 */
export function CandidateSheetImport({
  electionId,
  electionStatus,
  onImported,
}: {
  electionId: number;
  electionStatus: string;
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isDraft = electionStatus === "draft";
  const badRows = preview?.rows.filter((r) => r.errors.length > 0) ?? [];
  const canImport =
    !!preview && preview.errors.length === 0 && preview.invalid_rows === 0 && isDraft;

  async function choose(selected: File | null) {
    setFile(selected);
    setPreview(null);
    setResult(null);
    setErr(null);
    if (!selected) return;

    setBusy(true);
    try {
      setPreview(await adminImportPreview(electionId, selected));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await adminImportCommit(electionId, file);
      setResult(r);
      setPreview(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onImported();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={sectionStyle()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FileSpreadsheet size={18} /> Import from spreadsheet
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            className="govBtn"
            href={adminExportUrl(electionId)}
            style={linkButton()}
            title="Download this election's current lists and candidates"
          >
            <Download size={14} /> Export current data (.xlsx)
          </a>
          <a className="govBtn" href={adminImportTemplateUrl(electionId)} style={linkButton()}>
            <Download size={14} /> Blank template (.xlsx)
          </a>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "var(--gov-muted)", margin: "0 0 14px" }}>
        One row per candidate. Required columns: {COLUMNS.join(", ")}. Optional:
        list_name_ar, list_code, candidate_name_ar, confession, district, position,
        status. Lists, candidates and their membership are created in one pass;
        a constituency named in the sheet is attached to the election if it isn't
        already. Export uses the same layout, so a sheet exported from one
        election can be imported into another to clone its roster.
      </p>

      {!isDraft && (
        <div className="govError" style={{ marginBottom: 12 }}>
          This election is {electionStatus}. Only a draft election can be imported
          into — move it back to draft first.
        </div>
      )}

      {err && <div className="govError" style={{ marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
          style={{ fontSize: 13, color: "var(--gov-muted)" }}
        />
        {busy && <span style={{ fontSize: 13, color: "var(--gov-muted)" }}>Reading…</span>}
      </div>

      {result && (
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
            <Check size={18} color="#47a76f" /> Imported {result.imported.rows_processed} row(s).
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Stat label="Lists created" value={result.imported.lists_created} />
            <Stat label="Candidates created" value={result.imported.candidate_profiles_created} />
            <Stat label="Candidacies created" value={result.imported.candidacies_created} />
            <Stat label="Added to lists" value={result.imported.memberships_created} />
            <Stat label="Constituencies attached" value={result.imported.constituencies_attached} />
          </div>
        </div>
      )}

      {preview && (
        <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
          {preview.errors.length > 0 ? (
            <div className="govError">
              {preview.errors.map((e) => (
                <div key={e}>{e}</div>
              ))}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Stat label="Rows OK" value={preview.valid_rows} />
                <Stat label="Rows with errors" value={preview.invalid_rows} />
                <Stat label="Lists" value={preview.plan.lists} />
                <Stat label="Candidates" value={preview.plan.candidates} />
                <Stat label="Memberships" value={preview.plan.memberships} />
                <Stat label="Constituencies to attach" value={preview.plan.constituencies_to_attach} />
              </div>

              {badRows.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
                    <AlertTriangle size={16} color="#e5a23b" />
                    Fix these rows and upload again — nothing is imported while any row fails.
                  </div>
                  <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--gov-edge)", borderRadius: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ textAlign: "left", color: "var(--gov-muted)" }}>
                          <th style={{ padding: "8px 10px" }}>Row</th>
                          <th style={{ padding: "8px 10px" }}>Candidate</th>
                          <th style={{ padding: "8px 10px" }}>Problem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {badRows.slice(0, 100).map((r) => (
                          <tr key={r.line} style={{ borderTop: "1px solid var(--gov-edge)" }}>
                            <td style={{ padding: "8px 10px" }}>{r.line}</td>
                            <td style={{ padding: "8px 10px" }}>
                              {String(r.values.candidate_name ?? "—")}
                            </td>
                            <td style={{ padding: "8px 10px", color: "#e5484d" }}>
                              {r.errors.join(" ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {badRows.length > 100 && (
                    <div style={{ fontSize: 12, color: "var(--gov-muted)", marginTop: 6 }}>
                      Showing the first 100 of {badRows.length} failing rows.
                    </div>
                  )}
                </div>
              )}

              <div>
                <button
                  className="govBtn govBtnGold"
                  onClick={commit}
                  disabled={!canImport || busy}
                  style={{
                    padding: "10px 18px",
                    fontWeight: 800,
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                    ...(canImport ? {} : { opacity: 0.45, cursor: "not-allowed" }),
                  }}
                >
                  <Upload size={15} />
                  {busy ? "Importing…" : `Import ${preview.valid_rows} row(s)`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
