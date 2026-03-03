import { useState, useEffect } from "react";
import { Lock, Eye, Copy, Check } from "lucide-react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { Card, Section, Metric } from "../../components/common/Card";
import { useNotification } from "../../context/NotificationContext";
import {
  ElectionCard,
  VoteCandidate,
  SecurityBanner,
} from "../../components/dashboard/DashboardComponents";
import { Modal, Alert, Button } from "../../components/common/Modal";

interface Election {
  id: string;
  title: string;
  status: "open" | "closed" | "upcoming";
  startTime: Date;
  endTime: Date;
  totalCandidates: number;
  votedAt?: Date;
}

interface VotingPayload {
  selectedCandidate?: string;
  confirmationHash?: string;
}

export default function VoterDashboard() {
  const { warning } = useNotification();
  // elections list; will keep in state so we can mark votes
  const [elections, setElections] = useState<Election[]>([
    {
      id: "1",
      title: "Presidential Election 2026",
      status: "open",
      startTime: new Date(Date.now() - 7200000),
      endTime: new Date(Date.now() + 604800000), // 7 days
      totalCandidates: 5,
    },
    {
      id: "2",
      title: "Board of Directors 2026",
      status: "closed",
      startTime: new Date(Date.now() - 2592000000), // 30 days ago
      endTime: new Date(Date.now() - 1209600000), // 14 days ago
      totalCandidates: 8,
      votedAt: new Date(Date.now() - 2000000000),
    },
    {
      id: "3",
      title: "Local Council Elections",
      status: "upcoming",
      startTime: new Date(Date.now() + 2592000000), // 30 days from now
      endTime: new Date(Date.now() + 3196800000), // 37 days from now
      totalCandidates: 12,
    },
  ]);

  // keep track of elections the user has voted in (persisted locally)
  const [votedIds, setVotedIds] = useState<string[]>([]);

  // load voted ids from localStorage when component mounts
  useEffect(() => {
    const stored = localStorage.getItem("votedElections");
    if (stored) {
      try {
        const arr: string[] = JSON.parse(stored);
        setVotedIds(arr);
        // mark those elections as voted
        setElections((prev) =>
          prev.map((e) =>
            arr.includes(e.id) ? { ...e, votedAt: new Date() } : e
          )
        );
      } catch {}
    }
  }, []);

  const candidates = [
    { id: "1", name: "Sarah Johnson", party: "Democratic Alliance", biography: "Healthcare reform advocate" },
    { id: "2", name: "Michael Chen", party: "Progress Coalition", biography: "Technology and innovation leader" },
    { id: "3", name: "Elena Rodriguez", party: "Community First", biography: "Environmental policy expert" },
    { id: "4", name: "David Thompson", party: "Fiscal Conservatives", biography: "Economic development specialist" },
    { id: "5", name: "Lisa M. Patel", party: "Independent", biography: "Civil rights champion" },
  ];

  // States
  const [votingPayload, setVotingPayload] = useState<VotingPayload>({});
  const [votingState, setVotingState] = useState<"idle" | "selecting" | "confirming" | "encrypting" | "success">(
    "idle"
  );
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(0);

  const handleVoteClick = (election: Election) => {
    if (election.status !== "open") return;
    if (votedIds.includes(election.id) || election.votedAt) {
      warning(
        "You can only vote once per election. Your vote has been recorded.",
        "Already Voted"
      );
      return;
    }
    setSelectedElection(election);
    setVotingState("selecting");
  };

  const handleCandidateSelect = (candidateId: string) => {
    setSelectedCandidate(candidateId);
    setVotingPayload({ selectedCandidate: candidateId });
  };

  const handleConfirmVote = () => {
    setVotingState("confirming");
  };

  const handleEncryptAndSubmit = async () => {
    setVotingState("encrypting");
    setEncryptionProgress(0);

    // Simulate encryption process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setEncryptionProgress(i);
    }

    // Mock confirmation hash
    setVotingPayload((prev) => ({
      ...prev,
      confirmationHash: "0x" + Math.random().toString(16).slice(2).toUpperCase().slice(0, 64),
    }));

    setVotingState("success");
    // record vote locally
    if (selectedElection) {
      setVotedIds((prev) => {
        const updated = [...prev, selectedElection.id];
        localStorage.setItem("votedElections", JSON.stringify(updated));
        return updated;
      });
      setElections((prev) =>
        prev.map((e) =>
          e.id === selectedElection.id ? { ...e, votedAt: new Date() } : e
        )
      );
    }
  };

  const copyCertificate = () => {
    if (votingPayload.confirmationHash) {
      navigator.clipboard.writeText(votingPayload.confirmationHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetVoting = () => {
    setVotingState("idle");
    setSelectedElection(null);
    setSelectedCandidate(null);
    setVotingPayload({});
  };

  return (
    <DashboardLayout userEmail="voter@election.local" userRole="voter">
      {/* Header Banner */}
      <Section title="Your Elections" description="Active elections and voting history">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          {elections.map((election) => (
            <ElectionCard
              key={election.id}
              {...election}
              onClick={() => handleVoteClick(election)}
            />
          ))}
        </div>
      </Section>

      {/* Voting Modal */}
      <Modal
        isOpen={votingState !== "idle"}
        onClose={resetVoting}
        title={
          votingState === "selecting"
            ? "Select Your Choice"
            : votingState === "confirming"
              ? "Confirm Your Vote"
              : votingState === "encrypting"
                ? "Encrypting Your Ballot"
                : "Vote Submitted Successfully"
        }
        description={
          votingState === "selecting"
            ? `Choose your candidate for ${selectedElection?.title}`
            : votingState === "confirming"
              ? "Review your selection before encryption"
              : votingState === "encrypting"
                ? "Your ballot is being encrypted end-to-end"
                : "Your vote has been securely cast and counted"
        }
        maxWidth="600px"
        footer={
          votingState === "selecting"
            ? [
                <Button key="cancel" onClick={resetVoting}>
                  Cancel
                </Button>,
                selectedCandidate && (
                  <Button
                    key="continue"
                    variant="primary"
                    onClick={handleConfirmVote}
                  >
                    Continue
                  </Button>
                ),
              ]
            : votingState === "confirming"
              ? [
                  <Button key="back" onClick={() => setVotingState("selecting")}>
                    Back
                  </Button>,
                  <Button
                    key="confirm"
                    variant="primary"
                    onClick={handleEncryptAndSubmit}
                  >
                    Confirm & Encrypt
                  </Button>,
                ]
              : votingState === "encrypting"
                ? []
                : [
                    <Button key="done" variant="primary" onClick={resetVoting}>
                      Done
                    </Button>,
                  ]
        }
      >
        {votingState === "selecting" && (
          <div style={{ display: "grid", gap: "12px", maxHeight: "400px", overflowY: "auto" }}>
            {candidates.map((candidate) => (
              <VoteCandidate
                key={candidate.id}
                {...candidate}
                isSelected={selectedCandidate === candidate.id}
                onSelect={handleCandidateSelect}
              />
            ))}
          </div>
        )}

        {votingState === "confirming" && (
          <div style={{ display: "grid", gap: "16px" }}>
            <Alert
              variant="info"
              title="Final Confirmation"
              message="Once you confirm, your vote will be encrypted and submitted to the election authorities."
            />

            <Card>
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                  ELECTION
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700 }}>
                  {selectedElection?.title}
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                  YOUR SELECTION
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700 }}>
                  {candidates.find((c) => c.id === selectedCandidate)?.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                  {candidates.find((c) => c.id === selectedCandidate)?.party}
                </div>
              </div>
            </Card>

            <SecurityBanner
              message="Your ballot will be encrypted end-to-end before transmission"
              icon={<Lock size={16} />}
              variant="info"
            />
          </div>
        )}

        {votingState === "encrypting" && (
          <div style={{ display: "grid", gap: "24px" }}>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                Encryption Progress
              </div>
              <div
                style={{
                  height: "8px",
                  borderRadius: "4px",
                  background: "var(--gov-edge)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${encryptionProgress}%`,
                    background: "var(--gov-gold)",
                    transition: "width 200ms ease",
                  }}
                />
              </div>
              <div style={{ fontSize: "12px", color: "var(--gov-muted)", textAlign: "center" }}>
                {encryptionProgress}% Complete
              </div>
            </div>

            <SecurityBanner
              message="Using AES-256 end-to-end encryption"
              icon={<Lock size={16} />}
              variant="success"
            />
          </div>
        )}

        {votingState === "success" && (
          <div style={{ display: "grid", gap: "20px" }}>
            <SecurityBanner
              message="Your vote was successfully cast and encrypted"
              icon={<Check size={16} />}
              variant="success"
            />

            <Alert
              variant="success"
              title="Vote Confirmed"
              message="Your ballot has been securely submitted. Use your receipt hash to verify your vote later."
            />

            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ fontSize: "12px", color: "var(--gov-muted)", fontWeight: 600 }}>
                RECEIPT HASH (Keep Safe)
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--gov-edge)",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  color: "var(--gov-gold)",
                  wordBreak: "break-all",
                  alignItems: "center",
                }}
              >
                <span style={{ flex: 1 }}>{votingPayload.confirmationHash}</span>
                <button
                  type="button"
                  onClick={copyCertificate}
                  className="govBtn"
                  style={{
                    padding: "6px 8px",
                    minWidth: "auto",
                    flexShrink: 0,
                  }}
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <Alert
              variant="info"
              message="You can use this hash to verify your vote was counted at evote.gov/verify"
            />
          </div>
        )}
      </Modal>

      {/* Security Information */}
      <div style={{ marginTop: "40px" }}>
        <Section title="Security & Privacy">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            <Card>
              <Metric
                label="Session Encryption"
                value="AES-256"
                subtext="All data encrypted in transit"
                icon={<Lock size={18} />}
              />
            </Card>

            <Card>
              <Metric
                label="Authentication"
                value="WebAuthn"
                subtext="Hardware key or biometric"
                icon={<Eye size={18} />}
              />
            </Card>

            <Card>
              <Metric
                label="Ballot Anonymity"
                value="100%"
                subtext="Identity separated from vote"
                icon={<Eye size={18} />}
              />
            </Card>
          </div>
        </Section>
      </div>

      {/* Info Section */}
      <div style={{ marginTop: "40px" }}>
        <Section title="How Vote Encryption Works">
          <div style={{ display: "grid", gap: "12px" }}>
            <div
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid var(--gov-edge)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <h4 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700 }}>
                Step 1: Authentication
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--gov-muted)", lineHeight: 1.5 }}>
                You authenticate using your registered credentials and WebAuthn device.
                This verifies you are eligible and have not voted yet.
              </p>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid var(--gov-edge)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <h4 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700 }}>
                Step 2: Local Encryption
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--gov-muted)", lineHeight: 1.5 }}>
                Your ballot choice is encrypted using AES-256 encryption in your browser.
                The plaintext vote never leaves your device.
              </p>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid var(--gov-edge)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <h4 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700 }}>
                Step 3: Submission
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--gov-muted)", lineHeight: 1.5 }}>
                The encrypted ballot is transmitted over TLS 1.3 to election authorities.
                Your identity is logged, but vote remains anonymous.
              </p>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid var(--gov-edge)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <h4 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700 }}>
                Step 4: Immutable Record
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--gov-muted)", lineHeight: 1.5 }}>
                Your encrypted ballot is stored in an immutable audit log on a blockchain.
                You can verify your vote was counted using your receipt hash anytime.
              </p>
            </div>
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}
