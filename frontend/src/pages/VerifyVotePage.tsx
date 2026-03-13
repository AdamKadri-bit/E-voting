import { useMemo, useState } from "react";
import { Eye, Search, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import { Card } from "../components/common/Card";
import { verifyBallotChain, verifyReceipt } from "../lib/api";

export default function VerifyVotePage() {
  const [hash, setHash] = useState("");
  const [checking, setChecking] = useState(false);
  const [chainChecking, setChainChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptResult, setReceiptResult] = useState<any>(null);
  const [chainResult, setChainResult] = useState<any>(null);

  const trimmedHash = useMemo(() => hash.trim(), [hash]);

  async function handleVerifyReceipt() {
    if (!trimmedHash) {
      setError("Paste a receipt hash first.");
      return;
    }

    setChecking(true);
    setError(null);
    setReceiptResult(null);

    try {
      const res = await verifyReceipt(trimmedHash);
      setReceiptResult(res);
    } catch (e: any) {
      setError(e?.message || "Receipt verification failed.");
    } finally {
      setChecking(false);
    }
  }

  async function handleVerifyChain() {
    setChainChecking(true);
    setError(null);

    try {
      const res = await verifyBallotChain();
      setChainResult(res);
    } catch (e: any) {
      setError(e?.message || "Chain verification failed.");
    } finally {
      setChainChecking(false);
    }
  }

  return (
    <DashboardLayout userEmail={undefined}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(59, 130, 246, 0.14)",
              border: "1px solid rgba(59, 130, 246, 0.28)",
              color: "#60a5fa",
              fontSize: 12,
              fontWeight: 900,
              marginBottom: 14,
            }}
          >
            <Eye size={14} />
            Verification
          </div>

          <h1
            style={{
              fontSize: 40,
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.08,
            }}
          >
            Verify your vote
          </h1>

          <p
            style={{
              marginTop: 12,
              marginBottom: 0,
              color: "var(--gov-muted)",
              fontSize: 15,
              lineHeight: 1.75,
              maxWidth: 760,
            }}
          >
            Paste your receipt hash to check vote inclusion. You can also verify
            the ballot chain separately.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(239, 68, 68, 0.28)",
              background: "rgba(239, 68, 68, 0.10)",
              color: "#fca5a5",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

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
                  background: "rgba(59, 130, 246, 0.16)",
                  border: "1px solid rgba(59, 130, 246, 0.32)",
                  display: "grid",
                  placeItems: "center",
                  color: "#60a5fa",
                }}
              >
                <Search size={28} />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 900 }}>
                  Receipt lookup
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--gov-muted)",
                    lineHeight: 1.7,
                  }}
                >
                  Paste the receipt hash exactly as returned after vote
                  submission.
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <input
                  value={hash}
                  onChange={(e) => setHash(e.target.value)}
                  placeholder="Paste receipt hash"
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: "1px solid var(--gov-edge)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--gov-text)",
                    padding: "14px 16px",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />

                <button
                  onClick={handleVerifyReceipt}
                  disabled={checking || !trimmedHash}
                  style={{
                    appearance: "none",
                    border: "none",
                    outline: "none",
                    cursor: checking || !trimmedHash ? "not-allowed" : "pointer",
                    opacity: checking || !trimmedHash ? 0.55 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 14,
                    background: "rgba(59, 130, 246, 0.16)",
                    color: "#60a5fa",
                    fontWeight: 900,
                    fontSize: 14,
                    boxShadow: "inset 0 0 0 1px rgba(59, 130, 246, 0.32)",
                  }}
                >
                  {checking ? "Verifying..." : "Verify receipt"}
                </button>
              </div>

              {receiptResult && (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: "14px",
                    borderRadius: 14,
                    border: "1px solid rgba(71, 167, 111, 0.28)",
                    background: "rgba(71, 167, 111, 0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: "#86efac",
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span style={{ fontSize: 14, fontWeight: 900 }}>
                      Receipt found
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--gov-muted)",
                          fontWeight: 800,
                          marginBottom: 4,
                        }}
                      >
                        Status
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900 }}>
                        {String(
                          receiptResult?.status ??
                            receiptResult?.message ??
                            "Verified"
                        )}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--gov-muted)",
                          fontWeight: 800,
                          marginBottom: 4,
                        }}
                      >
                        Block
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900 }}>
                        {String(
                          receiptResult?.block_index ??
                            receiptResult?.block ??
                            "—"
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

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
                <ShieldCheck size={28} />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900 }}>
                  Chain verification
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--gov-muted)",
                    lineHeight: 1.7,
                  }}
                >
                  Run an audit check against the ballot chain endpoint.
                </div>
              </div>

              <button
                onClick={handleVerifyChain}
                disabled={chainChecking}
                style={{
                  appearance: "none",
                  border: "1px solid rgba(71, 167, 111, 0.32)",
                  background: "rgba(71, 167, 111, 0.16)",
                  color: "#47a76f",
                  borderRadius: 14,
                  padding: "14px 16px",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: chainChecking ? "not-allowed" : "pointer",
                  opacity: chainChecking ? 0.55 : 1,
                }}
              >
                {chainChecking ? "Checking chain..." : "Verify ballot chain"}
              </button>

              {chainResult && (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    padding: "14px",
                    borderRadius: 14,
                    border: "1px solid var(--gov-edge)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 900 }}>
                    Audit response
                  </div>

                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: "var(--gov-muted)",
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    }}
                  >
                    {JSON.stringify(chainResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          div[style*="grid-template-columns: 1.4fr 1fr"] {
            grid-template-columns: 1fr !important;
          }

          div[style*="repeat(2, minmax(0, 1fr))"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}