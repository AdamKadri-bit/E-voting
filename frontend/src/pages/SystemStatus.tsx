import PublicLayout from "../components/layouts/PublicLayout";

export default function SystemStatus() {
  return (
    <PublicLayout>
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "inherit" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>
          System Status
        </h2>
        <p style={{ fontSize: "16px", color: "var(--gov-muted)" }}>
          Status dashboard is not yet implemented. Please return later for live updates.
        </p>
      </div>
    </PublicLayout>
  );
}
