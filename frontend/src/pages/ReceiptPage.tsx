import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Receipt, Copy, ShieldCheck, Eye } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import { Card } from "../components/common/Card";

export default function ReceiptPage() {
  const nav = useNavigate();
  const { receiptHash } = useParams();

  const safeHash = useMemo(() => receiptHash ?? "", [receiptHash]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(safeHash);
    } catch {
      // ignore
    }
  }

  return (
    <DashboardLayout userEmail={undefined}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(71, 167, 111, 0.14)",
              border: "1px solid rgba(71, 167, 111, 0.28)",
              color: "#47a76f",
              fontSize: 12,
              fontWeight: 900,
              marginBottom: 14,
            }}
          >
            <ShieldCheck size={14} />
            Vote recorded
          </div>

          <h1
            style={{
              fontSize: 40,
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.08,
            }}
          >
            Your receipt
          </h1>

          <p
            style={{
              marginTop: 12,
              marginBottom: 0,
              color: "var(--gov-muted)",
              fontSize: 15,
              lineHeight: 1.75,
              maxWidth: 720,
            }}
          >
            Save this receipt hash. It is the value you will use later to verify
            that your vote was included.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 16,
          }}
        >
          <Card>
            <div style={{ display: "grid", gap: 18 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "rgba(71, 167, 111, 0.16)",
                  border: "1px solid rgba(71, 167, 111, 0.32)",
                  display: "grid",
                  placeItems: "center",
                  color: "#47a76f",
                }}
              >
                <Receipt size={28} />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 900 }}>
                  Receipt hash
                </div>

                <div
                  style={{
                    fontSize: 14,
                    color: "var(--gov-muted)",
                    lineHeight: 1.7,
                  }}
                >
                  Keep this value private and accessible. It allows you to verify
                  your vote later without exposing ballot content.
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: 16,
                  border: "1px solid var(--gov-edge)",
                  background: "rgba(255,255,255,0.03)",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: 13,
                  lineHeight: 1.7,
                  wordBreak: "break-word",
                }}
              >
                {safeHash || "No receipt hash found."}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={handleCopy}
                  style={{
                    appearance: "none",
                    border: "1px solid var(--gov-edge)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--gov-text)",
                    borderRadius: 14,
                    padding: "12px 16px",
                    fontWeight: 900,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Copy size={16} />
                  Copy receipt
                </button>

                <button
                  onClick={() => nav("/verify")}
                  style={{
                    appearance: "none",
                    border: "1px solid rgba(59, 130, 246, 0.32)",
                    background: "rgba(59, 130, 246, 0.14)",
                    color: "#60a5fa",
                    borderRadius: 14,
                    padding: "12px 16px",
                    fontWeight: 900,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Eye size={16} />
                  Go to verification
                </button>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                What to do now
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                {[
                  "Keep your receipt hash in a safe place.",
                  "Do not expect the receipt to reveal ballot content.",
                  "Use the Verify page whenever you want to check inclusion.",
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "24px 1fr",
                      gap: 10,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        border: "1px solid var(--gov-edge)",
                        background: "rgba(255,255,255,0.04)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 900,
                        color: "var(--gov-muted)",
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--gov-muted)",
                        lineHeight: 1.6,
                        paddingTop: 2,
                      }}
                    >
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          div[style*="grid-template-columns: 1.4fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}