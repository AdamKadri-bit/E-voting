import PublicLayout from "../components/layouts/PublicLayout";

export default function VerifyVote() {
  return (
    <PublicLayout>
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "inherit" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>
          Verify Your Vote
        </h2>
        <p style={{ fontSize: "16px", color: "var(--gov-muted)" }}>
          This feature is coming soon. In the meantime, please check back later.
        </p>
      </div>
    </PublicLayout>
  );
}
