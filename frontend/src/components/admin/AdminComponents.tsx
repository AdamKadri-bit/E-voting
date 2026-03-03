import { Edit2, Trash2, Play, StopCircle, TrendingUp } from "lucide-react";
import { Card, Badge } from "../common/Card";

type AdminElectionCardProps = {
  id: string;
  title: string;
  status: "draft" | "scheduled" | "active" | "closed" | "archived";
  startTime: Date;
  endTime: Date;
  registeredVoters?: number;
  votesReceived?: number;
  turnoutLoading?: boolean;
  onEdit?: (id: string) => void;
  onStart?: (id: string) => void;
  onStop?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function AdminElectionCard({
  id,
  title,
  status,
  startTime,
  endTime,
  registeredVoters = 0,
  votesReceived = 0,
  turnoutLoading = false,
  onEdit,
  onStart,
  onStop,
  onDelete,
}: AdminElectionCardProps) {
  const getStatusVariant = () => {
    switch (status) {
      case "active":
        return "success";
      case "scheduled":
        return "info";
      case "draft":
        return "default";
      case "closed":
        return "warning";
      case "archived":
        return "default";
      default:
        return "default";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const turnout = registeredVoters > 0 ? ((votesReceived / registeredVoters) * 100).toFixed(1) : "0";

  return (
    <Card>
      <div style={{ display: "grid", gap: "16px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, flex: 1 }}>
            {title}
          </h3>
          <Badge label={status.charAt(0).toUpperCase() + status.slice(1)} variant={getStatusVariant()} />
        </div>

        {/* Timing */}
        <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
          <div>Start: {formatDate(startTime)}</div>
          <div>End: {formatDate(endTime)}</div>
        </div>

        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "var(--gov-muted)", marginBottom: "4px" }}>
              REGISTERED VOTERS
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>
              {registeredVoters}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--gov-muted)", marginBottom: "4px" }}>
              VOTES CAST
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>
              {votesReceived}
            </div>
          </div>
        </div>

        {/* Turnout */}
        <div
          style={{
            padding: "12px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <TrendingUp size={18} color="var(--gov-gold)" />
          <div>
            <div style={{ fontSize: "11px", color: "var(--gov-muted)" }}>TURNOUT</div>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>
              {turnoutLoading ? "..." : `${turnout}%`}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button
            className="govBtn"
            onClick={() => onEdit?.(id)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px 12px", fontSize: "12px" }}
          >
            <Edit2 size={14} />
            Edit
          </button>

          {status === "draft" && (
            <button
              className="govBtn govBtnPrimary"
              onClick={() => onStart?.(id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px 12px", fontSize: "12px" }}
            >
              <Play size={14} />
              Start
            </button>
          )}

          {status === "active" && (
            <button
              className="govBtn"
              onClick={() => onStop?.(id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px 12px", fontSize: "12px" }}
            >
              <StopCircle size={14} />
              Close
            </button>
          )}

          {status === "draft" && (
            <button
              className="govBtn"
              onClick={() => onDelete?.(id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px 12px", fontSize: "12px", gridColumn: "2" }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

type AuditLogEntryProps = {
  timestamp: Date;
  eventType: "LOGIN" | "VOTE_CAST" | "ELECTION_START" | "ELECTION_CLOSED" | "ADMIN_ACTION" | "KEY_ROTATION";
  actor: string;
  actorRole: "voter" | "admin" | "system";
  details?: string;
};

export function AuditLogEntry({
  timestamp,
  eventType,
  actor,
  actorRole,
  details,
}: AuditLogEntryProps) {
  const eventColors: Record<string, string> = {
    LOGIN: "#3b82f6",
    VOTE_CAST: "#47a76f",
    ELECTION_START: "var(--gov-gold)",
    ELECTION_CLOSED: "#d97706",
    ADMIN_ACTION: "var(--gov-gold)",
    KEY_ROTATION: "#47a76f",
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <div
      style={{
        borderBottom: "1px solid var(--gov-edge)",
        padding: "14px 0",
        display: "grid",
        gap: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: eventColors[eventType] || "var(--gov-edge)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 600, fontSize: "13px" }}>
            {eventType.replace(/_/g, " ")}
          </span>
        </div>
        <span style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
          {formatTime(timestamp)}
        </span>
      </div>

      <div style={{ marginLeft: "20px", display: "grid", gap: "6px" }}>
        <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
          <strong>Actor:</strong> {actor} ({actorRole})
        </div>
        {details && (
          <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
            <strong>Details:</strong> {details}
          </div>
        )}
      </div>
    </div>
  );
}

type SystemHealthProps = {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  databaseStatus: "healthy" | "degraded" | "offline";
  encryptionStatus: "active" | "error";
  lastAuditTime: Date;
};

export function SystemHealth({
  cpuUsage,
  memoryUsage,
  activeConnections,
  databaseStatus,
  encryptionStatus,
  lastAuditTime,
}: SystemHealthProps) {
  return (
    <Card>
      <div style={{ display: "grid", gap: "20px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>System Health</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* CPU */}
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>CPU Usage</div>
            <div style={{ fontSize: "28px", fontWeight: 700 }}>
              {cpuUsage.toFixed(1)}%
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
                  width: `${cpuUsage}%`,
                  background: cpuUsage > 80 ? "var(--gov-alert)" : "var(--gov-gold)",
                  transition: "width 200ms ease",
                }}
              />
            </div>
          </div>

          {/* Memory */}
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>Memory Usage</div>
            <div style={{ fontSize: "28px", fontWeight: 700 }}>
              {memoryUsage.toFixed(1)}%
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
                  width: `${memoryUsage}%`,
                  background: memoryUsage > 80 ? "var(--gov-alert)" : "var(--gov-gold)",
                  transition: "width 200ms ease",
                }}
              />
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span>Active Connections</span>
            <strong>{activeConnections}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span>Database</span>
            <Badge
              label={databaseStatus.charAt(0).toUpperCase() + databaseStatus.slice(1)}
              variant={databaseStatus === "healthy" ? "success" : databaseStatus === "degraded" ? "warning" : "error"}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span>Encryption</span>
            <Badge
              label={encryptionStatus.charAt(0).toUpperCase() + encryptionStatus.slice(1)}
              variant={encryptionStatus === "active" ? "success" : "error"}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span>Last Audit</span>
            <span style={{ color: "var(--gov-muted)" }}>
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(lastAuditTime)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
