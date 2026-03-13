import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Vote,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import { Card, Section } from "../components/common/Card";
import { castVote, getBallot } from "../lib/api";

type CandidateProfile = {
  id: number;
  full_name?: string | null;
  full_name_ar?: string | null;
  national_id_number?: string | null;
};

type Candidacy = {
  id: number;
  candidate_profile?: CandidateProfile | null;
};

type ListCandidate = {
  id: number;
  candidacy_id: number;
  position_order?: number | null;
  candidacy?: Candidacy | null;
};

type BallotList = {
  id: number;
  list_name?: string | null;
  list_name_en?: string | null;
  list_name_ar?: string | null;
  list_candidates?: ListCandidate[];
};

type BallotResponse = {
  election?: {
    id?: number;
    title?: string;
  };
  constituency?: {
    id?: number;
    name?: string | null;
  };
  lists?: BallotList[];
};

export default function BallotPage() {
  const nav = useNavigate();
  const { electionId } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ballot, setBallot] = useState<BallotResponse | null>(null);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(
    null
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await getBallot(Number(electionId));
        if (!mounted) return;
        setBallot(data);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Could not load ballot.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (electionId) load();

    return () => {
      mounted = false;
    };
  }, [electionId]);

  const lists = ballot?.lists ?? [];

  const selectedList = useMemo(
    () => lists.find((l) => l.id === selectedListId) ?? null,
    [lists, selectedListId]
  );

  const selectedListCandidates = useMemo(
    () => selectedList?.list_candidates ?? [],
    [selectedList]
  );

  const selectedCandidate = useMemo(
    () =>
      selectedListCandidates.find((c) => c.candidacy_id === selectedCandidateId) ??
      null,
    [selectedListCandidates, selectedCandidateId]
  );

  function getListTitle(list: BallotList) {
    return (
      list.list_name ||
      list.list_name_en ||
      list.list_name_ar ||
      `List #${list.id}`
    );
  }

  function getCandidateName(item: ListCandidate) {
    return (
      item.candidacy?.candidate_profile?.full_name_ar ||
      item.candidacy?.candidate_profile?.full_name ||
      `Candidate #${item.candidacy_id}`
    );
  }

  async function handleSubmit() {
    if (!selectedListId) {
      setError("Select a list before submitting your ballot.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await castVote(Number(electionId), {
        list_id: selectedListId,
        candidate_id: selectedCandidateId,
      });

      const receiptHash =
        result?.receipt_hash ||
        result?.receiptHash ||
        result?.receipt?.hash ||
        result?.hash;

      if (!receiptHash) {
        throw new Error("Vote submitted but no receipt hash was returned.");
      }

      nav(`/receipt/${receiptHash}`);
    } catch (e: any) {
      setError(e?.message || "Vote submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout userEmail={undefined}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 16px" }}>
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
            <Vote size={14} />
            Ballot
          </div>

          <h1
            style={{
              fontSize: 40,
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.08,
            }}
          >
            Cast your ballot
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
            {ballot?.election?.title || "Election"}{" "}
            {ballot?.constituency?.name ? `— ${ballot.constituency.name}` : ""}
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
            gridTemplateColumns: "1.7fr 1fr",
            gap: 16,
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <Section
              title="Available lists"
              description="Choose one list to activate candidate preference."
            >
              {loading ? (
                <Card>
                  <div
                    style={{
                      minHeight: 120,
                      display: "grid",
                      placeItems: "center",
                      color: "var(--gov-muted)",
                      fontSize: 14,
                    }}
                  >
                    Loading ballot…
                  </div>
                </Card>
              ) : lists.length === 0 ? (
                <Card>
                  <div
                    style={{
                      minHeight: 120,
                      display: "grid",
                      placeItems: "center",
                      color: "var(--gov-muted)",
                      fontSize: 14,
                    }}
                  >
                    No ballot lists were returned.
                  </div>
                </Card>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {lists.map((list) => {
                    const active = selectedListId === list.id;
                    const listCandidates = list.list_candidates ?? [];

                    return (
                      <Card key={list.id} clickable>
                        <div
                          onClick={() => {
                            setSelectedListId(list.id);
                            setSelectedCandidateId(null);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedListId(list.id);
                              setSelectedCandidateId(null);
                            }
                          }}
                          style={{
                            display: "grid",
                            gap: 12,
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "auto 1fr auto",
                              gap: 14,
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 999,
                                border: active
                                  ? "6px solid #47a76f"
                                  : "2px solid var(--gov-edge)",
                                background: active
                                  ? "rgba(71, 167, 111, 0.14)"
                                  : "transparent",
                                boxSizing: "border-box",
                              }}
                            />

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 17,
                                  fontWeight: 900,
                                  marginBottom: 4,
                                }}
                              >
                                {getListTitle(list)}
                              </div>

                              <div
                                style={{
                                  fontSize: 13,
                                  color: "var(--gov-muted)",
                                  lineHeight: 1.6,
                                }}
                              >
                                {listCandidates.length > 0
                                  ? `${listCandidates.length} candidate(s) available`
                                  : "No candidate-level selection available"}
                              </div>
                            </div>

                            {active && (
                              <CheckCircle2
                                size={18}
                                style={{ color: "#47a76f" }}
                              />
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section
              title="Candidate preference"
              description="Optional unless your ballot rules require one."
            >
              {!selectedList ? (
                <Card>
                  <div
                    style={{
                      minHeight: 110,
                      display: "grid",
                      placeItems: "center",
                      color: "var(--gov-muted)",
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    Select a list first to view available candidates.
                  </div>
                </Card>
              ) : selectedListCandidates.length === 0 ? (
                <Card>
                  <div
                    style={{
                      minHeight: 110,
                      display: "grid",
                      placeItems: "center",
                      color: "var(--gov-muted)",
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    This list does not expose candidate-level selection.
                  </div>
                </Card>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  {selectedListCandidates.map((candidateItem) => {
                    const active =
                      selectedCandidateId === candidateItem.candidacy_id;

                    return (
                      <Card key={candidateItem.id} clickable>
                        <div
                          onClick={() =>
                            setSelectedCandidateId(candidateItem.candidacy_id)
                          }
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedCandidateId(candidateItem.candidacy_id);
                            }
                          }}
                          style={{
                            display: "grid",
                            gap: 12,
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "auto 1fr auto",
                              gap: 12,
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: 12,
                                border: active
                                  ? "1px solid rgba(71, 167, 111, 0.36)"
                                  : "1px solid var(--gov-edge)",
                                background: active
                                  ? "rgba(71, 167, 111, 0.14)"
                                  : "rgba(255,255,255,0.04)",
                                display: "grid",
                                placeItems: "center",
                                color: active ? "#47a76f" : "var(--gov-muted)",
                              }}
                            >
                              <UserCheck size={20} />
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 15,
                                  fontWeight: 900,
                                  lineHeight: 1.35,
                                }}
                              >
                                {getCandidateName(candidateItem)}
                              </div>
                            </div>

                            {active && (
                              <CheckCircle2
                                size={18}
                                style={{ color: "#47a76f" }}
                              />
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>

          <div style={{ display: "grid", gap: 16, alignSelf: "start" }}>
            <Card>
              <div style={{ display: "grid", gap: 18 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: "rgba(71, 167, 111, 0.16)",
                    border: "1px solid rgba(71, 167, 111, 0.32)",
                    display: "grid",
                    placeItems: "center",
                    color: "#47a76f",
                  }}
                >
                  <Vote size={28} />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>
                    Review selection
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--gov-muted)",
                      lineHeight: 1.7,
                    }}
                  >
                    Confirm the information below before submitting your ballot.
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: "14px",
                    borderRadius: 14,
                    border: "1px solid var(--gov-edge)",
                    background: "rgba(255,255,255,0.03)",
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
                      Election
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>
                      {ballot?.election?.title || `Election #${electionId}`}
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
                      Selected list
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>
                      {selectedList ? getListTitle(selectedList) : "None selected"}
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
                      Selected candidate
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>
                      {selectedCandidate
                        ? getCandidateName(selectedCandidate)
                        : "No candidate selected"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!selectedListId || loading || submitting}
                  style={{
                    appearance: "none",
                    border: "none",
                    outline: "none",
                    cursor:
                      !selectedListId || loading || submitting
                        ? "not-allowed"
                        : "pointer",
                    opacity: !selectedListId || loading || submitting ? 0.55 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 14,
                    background: "rgba(71, 167, 111, 0.18)",
                    color: "#47a76f",
                    fontWeight: 900,
                    fontSize: 14,
                    boxShadow: "inset 0 0 0 1px rgba(71, 167, 111, 0.35)",
                  }}
                >
                  {submitting ? "Submitting..." : "Submit ballot"}
                  <ChevronRight size={16} />
                </button>
              </div>
            </Card>

            <Card>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>
                  What happens next
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "var(--gov-muted)",
                    lineHeight: 1.7,
                  }}
                >
                  After submission, the system returns a receipt hash. Keep it.
                  You will use it later to verify inclusion in the final tally.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          div[style*="grid-template-columns: 1.7fr 1fr"] {
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