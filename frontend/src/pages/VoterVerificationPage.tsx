import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../components/layouts/DashboardLayout";
import { Card } from "../components/common/Card";
import {
  extractLebaneseIdOcr,
  linkRegistry,
  type LebaneseIdOcrData,
  type RegistryLinkPayload,
} from "../lib/api";

function normalizeDateForSubmit(value: string) {
  return value.replace(/\//g, "-").trim();
}

function buildRegistryPayload(data: LebaneseIdOcrData): RegistryLinkPayload {
  return {
    full_name: data.full_name.trim(),
    father_name: data.father_name.trim(),
    mother_name: data.mother_name.trim(),
    date_of_birth: normalizeDateForSubmit(data.date_of_birth),
    civil_registry_number: data.civil_registry_number?.trim() || null,
  };
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

  const [ocrLoading, setOcrLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const busy = ocrLoading || verifying;

  function resetExtraction() {
    setExtractedData(null);
    setOk(null);
    setErr(null);
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

    try {
      const result = await extractLebaneseIdOcr(frontImage, backImage);
      setExtractedData(result.data);

      if (!result.data.civil_registry_number) {
        setErr(
          "OCR finished, but the registry number was not extracted. Remove the unclear image and upload a sharper one."
        );
      }
    } catch (e: any) {
      setErr(e?.message || "Could not extract document information.");
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleConfirmVerify() {
    setErr(null);
    setOk(null);

    if (!extractedData) {
      setErr("Extract the ID information first.");
      return;
    }

    const payload = buildRegistryPayload(extractedData);

    if (
      !payload.full_name ||
      !payload.father_name ||
      !payload.mother_name ||
      !payload.date_of_birth ||
      !payload.civil_registry_number
    ) {
      setErr("The extracted data is incomplete. Upload clearer images.");
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
                disabled={busy || !frontImage || !backImage}
                onClick={handleExtract}
                className="govBtn govBtnPrimary"
                style={{
                  fontWeight: 900,
                  opacity: busy || !frontImage || !backImage ? 0.55 : 1,
                  cursor:
                    busy || !frontImage || !backImage
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {ocrLoading ? "Reading document..." : "Extract information"}
              </button>
            </div>

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
                    These fields are locked. If something is wrong, remove the
                    image and upload a clearer one.
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <ReadOnlyField label="Full name" value={extractedData.full_name} />
                  <ReadOnlyField label="Father name" value={extractedData.father_name} />
                  <ReadOnlyField label="Mother name" value={extractedData.mother_name} />
                  <ReadOnlyField label="Date of birth" value={extractedData.date_of_birth} />
                  <ReadOnlyField label="Place of birth" value={extractedData.place_of_birth} />
                  <ReadOnlyField label="National ID number" value={extractedData.national_id_number} />
                  <ReadOnlyField label="Registry number" value={extractedData.civil_registry_number} />
                  <ReadOnlyField label="Governorate" value={extractedData.governorate} />
                  <ReadOnlyField label="District" value={extractedData.district} />
                  <ReadOnlyField label="Locality" value={extractedData.locality} />
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleConfirmVerify}
                    className="govBtn govBtnPrimary"
                    style={{
                      fontWeight: 900,
                      opacity: busy ? 0.55 : 1,
                      cursor: busy ? "not-allowed" : "pointer",
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