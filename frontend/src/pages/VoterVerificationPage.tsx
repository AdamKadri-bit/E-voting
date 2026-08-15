import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../components/layouts/DashboardLayout";
import { Card } from "../components/common/Card";
import {
  extractLebaneseIdOcr,
  linkRegistry,
  getMe,
  type LebaneseIdOcrData,
  type RegistryLinkPayload,
} from "../lib/api";

function normalizeDateForSubmit(value: string) {
  return value.replace(/\//g, "-").trim();
}

/** The fields the registry match needs; everything else is context only. */
type RequiredField = "full_name" | "father_name" | "mother_name" | "date_of_birth";

const REQUIRED_FIELDS: { key: RequiredField; label: string; type?: string }[] = [
  { key: "full_name", label: "Full name" },
  { key: "father_name", label: "Father name" },
  { key: "mother_name", label: "Mother name" },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
];

type EditableForm = Record<RequiredField, string> & { civil_registry_number: string };

function formFromExtraction(data: LebaneseIdOcrData): EditableForm {
  return {
    full_name: (data.full_name ?? "").trim(),
    father_name: (data.father_name ?? "").trim(),
    mother_name: (data.mother_name ?? "").trim(),
    date_of_birth: normalizeDateForSubmit(data.date_of_birth ?? ""),
    civil_registry_number: (data.civil_registry_number ?? "").trim(),
  };
}

function buildRegistryPayload(form: EditableForm): RegistryLinkPayload {
  return {
    full_name: form.full_name.trim(),
    father_name: form.father_name.trim(),
    mother_name: form.mother_name.trim(),
    date_of_birth: normalizeDateForSubmit(form.date_of_birth),
    civil_registry_number: form.civil_registry_number.trim() || null,
  };
}

/** Upload progress, so a slow phone upload doesn't look like a frozen page. */
function UploadProgress({ percent, phase }: { percent: number; phase: string }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ fontWeight: 800, color: "var(--gov-ink)" }}>{phase}</span>
        <span style={{ color: "var(--gov-muted)", fontVariantNumeric: "tabular-nums" }}>
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid var(--gov-edge)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: "var(--gov-gold, #c9a227)",
            transition: "width 160ms ease",
          }}
        />
      </div>
    </div>
  );
}

function FilePreview({
  file,
  label,
  disabled,
  onRemove,
}: {
  file: File;
  label: string;
  disabled: boolean;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "58px 1fr",
        gap: 12,
        alignItems: "center",
        border: "1px solid rgba(201,162,39,0.28)",
        borderRadius: 16,
        padding: 10,
        background: "rgba(201,162,39,0.08)",
      }}
    >
      {previewUrl && (
        <img
          src={previewUrl}
          alt={label}
          style={{
            width: 58,
            height: 44,
            borderRadius: 10,
            objectFit: "cover",
            border: "1px solid var(--gov-edge)",
            background: "rgba(255,255,255,0.06)",
          }}
        />
      )}

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--gov-muted)" }}>Uploaded</div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "var(--gov-ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={file.name}
        >
          {file.name}
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        style={{
          position: "absolute",
          top: -8,
          right: -8,
          width: 26,
          height: 26,
          borderRadius: 999,
          border: "1px solid var(--gov-edge)",
          background: "rgba(7,16,34,0.95)",
          color: "white",
          fontWeight: 900,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}

function UploadBox({
  id,
  label,
  helper,
  file,
  disabled,
  onChange,
  onRemove,
}: {
  id: string;
  label: string;
  helper: string;
  file: File | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--gov-edge)",
        borderRadius: 18,
        padding: 16,
        background: "rgba(255,255,255,0.035)",
        display: "grid",
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 16, color: "var(--gov-ink)" }}>
          {label}
        </div>
        <div style={{ color: "var(--gov-muted)", fontSize: 13, marginTop: 5 }}>
          {helper}
        </div>
      </div>

      {file ? (
        <FilePreview
          file={file}
          label={label}
          disabled={disabled}
          onRemove={onRemove}
        />
      ) : (
        <label
          htmlFor={id}
          style={{
            minHeight: 118,
            border: "1px dashed rgba(201,162,39,0.46)",
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            padding: 16,
            background: "rgba(201,162,39,0.055)",
            cursor: disabled ? "not-allowed" : "pointer",
            textAlign: "center",
          }}
        >
          <div>
            <div
              style={{
                width: 42,
                height: 42,
                margin: "0 auto 10px",
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(201,162,39,0.38)",
                background: "rgba(201,162,39,0.12)",
                color: "var(--gov-gold)",
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              +
            </div>
            <div style={{ fontWeight: 900, color: "var(--gov-ink)" }}>
              Upload image
            </div>
            <div style={{ color: "var(--gov-muted)", fontSize: 12, marginTop: 4 }}>
              PNG, JPG, or camera photo
            </div>
          </div>
        </label>
      )}

      <input
        id={id}
        type="file"
        accept="image/*"
        disabled={disabled}
        style={{ display: "none" }}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

/**
 * A field the scan filled in and the person can correct. Blank required
 * fields are flagged, because a blank one is exactly what the registry
 * endpoint answers with a 422.
 */
function EditableField({
  label,
  value,
  onChange,
  missing,
  disabled,
  type = "text",
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  missing: boolean;
  disabled: boolean;
  type?: string;
  optional?: boolean;
}) {
  return (
    <label
      style={{
        border: `1px solid ${missing ? "rgba(255,107,107,0.55)" : "var(--gov-edge)"}`,
        borderRadius: 14,
        padding: "10px 12px",
        background: missing ? "rgba(255,107,107,0.07)" : "rgba(255,255,255,0.035)",
        display: "grid",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--gov-muted)" }}>
        {label}
        {optional && <span style={{ opacity: 0.7 }}> (optional)</span>}
        {missing && (
          <span style={{ color: "var(--gov-alert)", fontWeight: 800 }}> — not read</span>
        )}
      </span>
      <input
        dir="auto"
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={missing ? "Type it from the ID" : ""}
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 15,
          fontWeight: 900,
          color: "var(--gov-ink)",
          width: "100%",
          padding: 0,
        }}
      />
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--gov-edge)",
        borderRadius: 14,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.035)",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--gov-muted)", marginBottom: 5 }}>
        {label}
      </div>
      <div
        dir="auto"
        style={{
          fontSize: 15,
          fontWeight: 900,
          color: value ? "var(--gov-ink)" : "var(--gov-muted)",
        }}
      >
        {value || "Not extracted"}
      </div>
    </div>
  );
}

export default function VoterVerificationPage() {
  const nav = useNavigate();

  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<LebaneseIdOcrData | null>(
    null
  );

  const [form, setForm] = useState<EditableForm | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [alreadyLinked, setAlreadyLinked] = useState(false);

  const busy = ocrLoading || verifying;

  // An account can hold only one registry record. Finding that out here, on
  // load, beats letting someone photograph their ID and only then be told —
  // which is what the 422 from the link endpoint used to mean.
  useEffect(() => {
    getMe()
      .then((res: any) => {
        if (res?.user?.registry_person_id) setAlreadyLinked(true);
      })
      .catch(() => {
        /* not fatal: the flow still works, it just can't warn early */
      });
  }, []);

  function resetExtraction() {
    setExtractedData(null);
    setForm(null);
    setOk(null);
    setErr(null);
    setProgress(null);
  }

  function handleFrontImage(file: File | null) {
    setFrontImage(file);
    resetExtraction();
  }

  function handleBackImage(file: File | null) {
    setBackImage(file);
    resetExtraction();
  }

  function removeFrontImage() {
    setFrontImage(null);
    resetExtraction();
  }

  function removeBackImage() {
    setBackImage(null);
    resetExtraction();
  }

  async function handleExtract() {
    setErr(null);
    setOk(null);

    if (!frontImage || !backImage) {
      setErr("Upload both the front and back images first.");
      return;
    }

    setOcrLoading(true);
    setProgress(0);

    try {
      const result = await extractLebaneseIdOcr(frontImage, backImage, setProgress);
      setExtractedData(result.data);
      setForm(formFromExtraction(result.data));

      const filled = formFromExtraction(result.data);
      const missing = REQUIRED_FIELDS.filter((f) => !filled[f.key]).map((f) => f.label);

      if (missing.length > 0) {
        setErr(
          `The scan could not read: ${missing.join(", ")}. Fill those in below, or upload a sharper photo.`
        );
      } else if (!filled.civil_registry_number) {
        setErr(
          "The registry number was not read from the back of the ID. You can add it below, or upload a sharper photo."
        );
      }
    } catch (e: any) {
      setErr(e?.message || "Could not extract document information.");
    } finally {
      setOcrLoading(false);
      setProgress(null);
    }
  }

  async function handleConfirmVerify() {
    setErr(null);
    setOk(null);

    if (!form) {
      setErr("Extract the ID information first.");
      return;
    }

    const payload = buildRegistryPayload(form);

    // Name the fields that are still blank instead of refusing as a block —
    // the server rejects the same set with a 422, so catching it here tells
    // the person which box to fill.
    const missing = REQUIRED_FIELDS.filter((f) => !payload[f.key]).map((f) => f.label);

    if (missing.length > 0) {
      setErr(`Still missing: ${missing.join(", ")}.`);
      return;
    }

    setVerifying(true);

    try {
      const result = await linkRegistry(payload);
      setOk(result?.message || "Voter registry record linked successfully.");

      setTimeout(() => {
        nav("/dashboard", { replace: true });
      }, 800);
    } catch (e: any) {
      setErr(e?.message || "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid rgba(201,162,39,0.32)",
              borderRadius: 999,
              padding: "7px 11px",
              color: "var(--gov-gold)",
              background: "rgba(201,162,39,0.08)",
              fontSize: 12,
              fontWeight: 900,
              marginBottom: 12,
            }}
          >
            Registry verification
          </div>

          <h1
            style={{
              fontSize: 36,
              fontWeight: 900,
              margin: "0 0 8px",
              color: "var(--gov-ink)",
            }}
          >
            Verify Voter Record
          </h1>

          <p
            style={{
              color: "var(--gov-muted)",
              maxWidth: 760,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Upload both sides of the national ID. The extracted information is
            shown as read-only and then used to check the registry.
          </p>
        </div>

        {err && (
          <div
            style={{
              color: "var(--gov-alert)",
              background: "rgba(255,107,107,0.1)",
              border: "1px solid rgba(255,107,107,0.28)",
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
              fontWeight: 800,
            }}
          >
            {err}
          </div>
        )}

        {ok && (
          <div
            style={{
              color: "#47a76f",
              background: "rgba(71,167,111,0.1)",
              border: "1px solid rgba(71,167,111,0.28)",
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
              fontWeight: 800,
            }}
          >
            {ok}
          </div>
        )}

        {alreadyLinked && (
          <div
            style={{
              color: "#47a76f",
              background: "rgba(71,167,111,0.1)",
              border: "1px solid rgba(71,167,111,0.28)",
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 800 }}>
              This account is already linked to a voter registry record. There is
              nothing left to verify.
            </span>
            <button
              type="button"
              className="govBtn"
              onClick={() => nav("/dashboard", { replace: true })}
              style={{ padding: "8px 14px", fontWeight: 800 }}
            >
              Back to dashboard
            </button>
          </div>
        )}

        <Card>
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
                gap: 14,
              }}
            >
              <UploadBox
                id="front-id-upload"
                label="Front side"
                helper="Name, parents' names, date of birth, place of birth, and ID number."
                file={frontImage}
                disabled={busy}
                onChange={handleFrontImage}
                onRemove={removeFrontImage}
              />

              <UploadBox
                id="back-id-upload"
                label="Back side"
                helper="Registry number, governorate, district, and locality."
                file={backImage}
                disabled={busy}
                onChange={handleBackImage}
                onRemove={removeBackImage}
              />
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={busy || alreadyLinked || !frontImage || !backImage}
                onClick={handleExtract}
                className="govBtn govBtnPrimary"
                style={{
                  fontWeight: 900,
                  opacity: busy || alreadyLinked || !frontImage || !backImage ? 0.55 : 1,
                  cursor:
                    busy || alreadyLinked || !frontImage || !backImage
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {ocrLoading ? "Reading document..." : "Extract information"}
              </button>
            </div>

            {progress !== null && (
              <UploadProgress
                percent={progress}
                phase={progress < 100 ? "Uploading images" : "Reading the document"}
              />
            )}

            {extractedData && (
              <div
                style={{
                  borderTop: "1px solid var(--gov-edge)",
                  paddingTop: 18,
                  display: "grid",
                  gap: 16,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      margin: 0,
                      color: "var(--gov-ink)",
                    }}
                  >
                    Extracted information
                  </h2>
                  <p
                    style={{
                      color: "var(--gov-muted)",
                      marginTop: 6,
                      marginBottom: 0,
                    }}
                  >
                    Arabic script does not always survive a photograph. Correct
                    anything the scan misread before verifying — the values still
                    have to match the voter registry exactly, so a wrong entry
                    simply fails to match.
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  {form &&
                    REQUIRED_FIELDS.map((field) => (
                      <EditableField
                        key={field.key}
                        label={field.label}
                        type={field.type}
                        value={form[field.key]}
                        missing={!form[field.key]}
                        disabled={busy}
                        onChange={(value) => setForm({ ...form, [field.key]: value })}
                      />
                    ))}

                  {form && (
                    <EditableField
                      label="Registry number"
                      value={form.civil_registry_number}
                      missing={false}
                      disabled={busy}
                      optional
                      onChange={(value) =>
                        setForm({ ...form, civil_registry_number: value })
                      }
                    />
                  )}

                  <ReadOnlyField label="Place of birth" value={extractedData.place_of_birth} />
                  <ReadOnlyField label="National ID number" value={extractedData.national_id_number} />
                  <ReadOnlyField label="Governorate" value={extractedData.governorate} />
                  <ReadOnlyField label="District" value={extractedData.district} />
                  <ReadOnlyField label="Locality" value={extractedData.locality} />
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={busy || alreadyLinked}
                    onClick={handleConfirmVerify}
                    className="govBtn govBtnPrimary"
                    style={{
                      fontWeight: 900,
                      opacity: busy || alreadyLinked ? 0.55 : 1,
                      cursor: busy || alreadyLinked ? "not-allowed" : "pointer",
                    }}
                  >
                    {verifying ? "Verifying..." : "Confirm and verify"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}