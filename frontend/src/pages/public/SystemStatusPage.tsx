import { TrendingUp, CheckCircle2, Server } from "lucide-react";
import PublicLayout from "../../components/layouts/PublicLayout";
import { Section, Metric, Card } from "../../components/common/Card";

export default function SystemStatusPage() {
  // Mock data - in production, this comes from API
  const systemMetrics = {
    uptime: 99.98,
    activeConnections: 12847,
    requestsPerSecond: 2341,
    databaseLatency: 12,
    encryptionStatus: "active" as const,
    lastAuditTime: new Date(Date.now() - 1800000), // 30 min ago
    lastKeyRotation: new Date(Date.now() - 86400000 * 7), // 7 days ago
  };

  const incidents = [
    {
      date: new Date(Date.now () - 3600000 * 24 * 3),
      title: "Scheduled Maintenance",
      severity: "info" as const,
      description: "Database optimization completed successfully.",
    },
    {
      date: new Date(Date.now() - 3600000 * 24 * 10),
      title: "Security Audit",
      severity: "info" as const,
      description: "Third-party penetration testing completed. No vulnerabilities found.",
    },
  ];

  const infrastructure = [
    { name: "US-East-1 Primary", status: "operational" as const, cpuUsage: 34, memUsage: 42 },
    { name: "US-West-1 Secondary", status: "operational" as const, cpuUsage: 28, memUsage: 38 },
    { name: "EU-Central-1 Tertiary", status: "operational" as const, cpuUsage: 31, memUsage: 40 },
  ];

  const securityIndicators = [
    { name: "Encryption Active", status: "ok" as const, lastCheck: new Date(Date.now() - 60000) },
    { name: "Audit Logs", status: "ok" as const, lastCheck: new Date(Date.now() - 120000) },
    { name: "Backup Systems", status: "ok" as const, lastCheck: new Date(Date.now() - 180000) },
    { name: "Intrusion Detection", status: "ok" as const, lastCheck: new Date(Date.now() - 300000) },
  ];

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <PublicLayout>
      <div className="govHero">
        <div className="govHeroInner">
          {/* Hero Text */}
          <div style={{ textAlign: "center", maxWidth: "700px" }}>
            <h1
              style={{
                fontSize: "42px",
                fontWeight: 800,
                margin: "0 0 16px",
                letterSpacing: 0.4,
              }}
            >
              System Status
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "var(--gov-muted)",
                margin: "0 0 32px",
                lineHeight: 1.8,
              }}
            >
              Real-time monitoring of E-Voting system infrastructure, security, and performance.
              All systems operational. 100% transparency.
            </p>

            {/* Overall Status */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "16px 20px",
                borderRadius: "12px",
                background: "rgba(71,167,111,0.1)",
                border: "1px solid rgba(71,167,111,0.3)",
                width: "fit-content",
                margin: "0 auto",
              }}
            >
              <CheckCircle2 size={20} color="#47a76f" />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#47a76f" }}>
                All Systems Operational
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Sections */}
      <div className="govSections">
        {/* Key Metrics */}
        <Section title="System Health Metrics">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            <Card>
              <Metric
                label="Uptime"
                value={`${systemMetrics.uptime}%`}
                subtext="Last 30 days"
                icon={<TrendingUp size={18} />}
              />
            </Card>

            <Card>
              <Metric
                label="Active Connections"
                value={systemMetrics.activeConnections.toLocaleString()}
                subtext="Real-time connections"
                icon={<Server size={18} />}
              />
            </Card>

            <Card>
              <Metric
                label="Requests/Second"
                value={systemMetrics.requestsPerSecond.toLocaleString()}
                subtext="Current throughput"
                icon={<TrendingUp size={18} />}
              />
            </Card>

            <Card>
              <Metric
                label="DB Latency"
                value={`${systemMetrics.databaseLatency}ms`}
                subtext="Average response time"
                icon={<Server size={18} />}
              />
            </Card>
          </div>
        </Section>

        {/* Infrastructure */}
        <Section title="Infrastructure Locations">
          <div style={{ display: "grid", gap: "12px" }}>
            {infrastructure.map((region, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--gov-edge)",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "rgba(255,255,255,0.03)",
                  display: "grid",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                    {region.name}
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "#47a76f",
                    }}
                  >
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#47a76f",
                        animation: "pulse 2s infinite",
                      }}
                    />
                    {region.status}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--gov-muted)", marginBottom: "6px" }}>
                      CPU
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>
                      {region.cpuUsage}%
                    </div>
                    <div
                      style={{
                        height: "4px",
                        borderRadius: "2px",
                        background: "var(--gov-edge)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${region.cpuUsage}%`,
                          background: "var(--gov-gold)",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--gov-muted)", marginBottom: "6px" }}>
                      MEMORY
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>
                      {region.memUsage}%
                    </div>
                    <div
                      style={{
                        height: "4px",
                        borderRadius: "2px",
                        background: "var(--gov-edge)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${region.memUsage}%`,
                          background: "var(--gov-gold)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Security Status */}
        <Section title="Security Indicators">
          <div style={{ display: "grid", gap: "12px" }}>
            {securityIndicators.map((indicator, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--gov-edge)",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "rgba(255,255,255,0.03)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                    {indicator.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                    Last check: {formatDate(indicator.lastCheck)}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    color: "#47a76f",
                  }}
                >
                  <CheckCircle2 size={16} />
                  OK
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Recent Incidents */}
        <Section title="Incident History">
          <div style={{ display: "grid", gap: "12px" }}>
            {incidents.map((incident, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--gov-edge)",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>
                    {incident.title}
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background: "rgba(59,130,246,0.15)",
                      color: "#3b82f6",
                    }}
                  >
                    INFO
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "var(--gov-muted)",
                    marginBottom: "8px",
                  }}
                >
                  {incident.description}
                </p>
                <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                  {incident.date.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Maintenance Windows */}
        <Section title="Upcoming Maintenance">
          <div
            style={{
              border: "1px solid var(--gov-edge)",
              borderRadius: "12px",
              padding: "20px",
              background: "rgba(255,255,255,0.03)",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: "14px", color: "var(--gov-muted)" }}>
              No maintenance windows scheduled. System is fully operational.
            </p>
          </div>
        </Section>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </PublicLayout>
  );
}
