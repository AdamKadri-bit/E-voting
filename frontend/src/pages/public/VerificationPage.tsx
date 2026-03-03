import { useState } from "react";
import { CheckCircle2, Search, ChevronDown, ChevronUp } from "lucide-react";
import PublicLayout from "../../components/layouts/PublicLayout";
import { Section, Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Modal";

type VerificationResult = {
  found: boolean;
  election?: string;
  timestamp?: Date;
  status?: "confirmed" | "pending" | "disputed";
};

export default function VerificationPage() {
  const [receiptHash, setReceiptHash] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptHash.trim()) return;

    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setResult({
        found: Math.random() > 0.3,
        election: "Presidential Election 2026",
        timestamp: new Date(),
        status: "confirmed",
      });
      setIsSearching(false);
    }, 1500);
  };

  return (
    <PublicLayout>
      <div className="govHero">
        <div className="govHeroInner">
          {/* Hero Text */}
          <div style={{ textAlign: "center", maxWidth: "600px" }}>
            <h1
              style={{
                fontSize: "42px",
                fontWeight: 800,
                margin: "0 0 16px",
                letterSpacing: 0.4,
              }}
            >
              Verify Your Vote
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "var(--gov-muted)",
                margin: "0 0 40px",
                lineHeight: 1.8,
              }}
            >
              Enter your vote receipt hash to confirm your ballot was counted correctly.
              Your privacy is completely protected—this lookup requires no personal information.
            </p>

            {/* Verification Form */}
            <Card>
              <form onSubmit={handleVerify} className="govForm">
                <label className="govLabel">
                  <span>Receipt Hash</span>
                  <input
                    type="text"
                    className="govInput"
                    placeholder="Paste your receipt hash..."
                    value={receiptHash}
                    onChange={(e) => setReceiptHash(e.target.value)}
                    disabled={isSearching}
                  />
                </label>

                <button
                  type="submit"
                  className="govBtn govBtnPrimary"
                  disabled={isSearching || !receiptHash.trim()}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: isSearching || !receiptHash.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {isSearching ? (
                    <>
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid rgba(201,162,39,0.3)",
                          borderTopColor: "var(--gov-gold)",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      Verify Vote
                    </>
                  )}
                </button>
              </form>
            </Card>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="govSections">
          <Section title="Verification Result">
            {result.found ? (
              <Card>
                <div style={{ display: "grid", gap: "24px" }}>
                  {/* Success Banner */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "24px",
                      borderRadius: "12px",
                      background: "rgba(71,167,111,0.1)",
                      border: "1px solid rgba(71,167,111,0.3)",
                    }}
                  >
                    <CheckCircle2 size={32} color="#47a76f" strokeWidth={1.5} />
                    <div>
                      <h3
                        style={{
                          margin: "0 0 6px",
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "#47a76f",
                        }}
                      >
                        Vote Confirmed
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          color: "var(--gov-muted)",
                        }}
                      >
                        Your vote was received and counted in the election.
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ display: "grid", gap: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div style={{ padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                        <div style={{ fontSize: "11px", color: "var(--gov-muted)", marginBottom: "8px", fontWeight: 600 }}>
                          ELECTION
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 600 }}>
                          {result.election}
                        </div>
                      </div>

                      <div style={{ padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                        <div style={{ fontSize: "11px", color: "var(--gov-muted)", marginBottom: "8px", fontWeight: 600 }}>
                          TIMESTAMP
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 600 }}>
                          {result.timestamp?.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                      <div style={{ fontSize: "11px", color: "var(--gov-muted)", marginBottom: "8px", fontWeight: 600 }}>
                        STATUS
                      </div>
                      <div
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          background: "rgba(71,167,111,0.15)",
                          color: "#47a76f",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {result.status && (result.status.charAt(0).toUpperCase() +
                          result.status.slice(1))}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.3)",
                      color: "#3b82f6",
                      fontSize: "12px",
                    }}
                  >
                    <p style={{ margin: 0, lineHeight: 1.6 }}>
                      ℹ️ Your vote content is not displayed for your privacy protection.
                      This system only confirms that your ballot was successfully recorded
                      and counted in the election.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Alert
                variant="error"
                title="No Match Found"
                message="This receipt hash was not found in our system. Please check that you copied it correctly."
              />
            )}
          </Section>
        </div>
      )}

      {/* FAQ Section */}
      <div className="govSections" style={{ marginTop: "80px", paddingBottom: "60px" }}>
        <Section title="Frequently Asked Questions">
          <div style={{ display: "grid", gap: "12px" }}>
            {[
              {
                q: "Is my vote hash secure?",
                a: "Yes. Your receipt hash is a cryptographic digest that cannot be reverse-engineered to reveal your vote. Keep it safe as proof of your vote.",
              },
              {
                q: "What if my vote is not found?",
                a: "Double-check you copied the hash correctly. If issues persist, contact election officials for assistance.",
              },
              {
                q: "Can I use this to change my vote?",
                a: "No. Verification is read-only and cannot modify any records. Votes are final once cast.",
              },
              {
                q: "Is my identity exposed?",
                a: "Absolutely not. This verification system requires zero personal information. Complete anonymity is guaranteed.",
              },
            ].map((faq, idx) => (
              <button
                key={idx}
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: "12px",
                  border: "1px solid var(--gov-edge)",
                  padding: "16px",
                  background: "rgba(255,255,255,0.03)",
                  color: "inherit",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "grid",
                  gap: "12px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(201,162,39,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "var(--gov-edge)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                    {faq.q}
                  </h4>
                  {expandedFaq === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                {expandedFaq === idx && (
                  <p 
                    style={{ 
                      margin: 0, 
                      fontSize: "13px", 
                      color: "var(--gov-muted)", 
                      lineHeight: 1.6,
                      paddingTop: "8px",
                      borderTop: "1px solid var(--gov-edge)",
                    }}
                  >
                    {faq.a}
                  </p>
                )}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PublicLayout>
  );
}
