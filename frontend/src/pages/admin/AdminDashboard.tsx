import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Users, TrendingUp, X } from "lucide-react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { Section, Card, Metric } from "../../components/common/Card";
import { AdminElectionCard, SystemHealth } from "../../components/admin/AdminComponents";
import { Modal, Alert, Button } from "../../components/common/Modal";
import { useNotification } from "../../context/NotificationContext";

interface AdminElection {
  id: string;
  title: string;
  status: "draft" | "scheduled" | "active" | "closed" | "archived";
  startTime: Date;
  endTime: Date;
  registeredVoters: number;
  votesReceived: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { info } = useNotification();
  const [currentPage, setCurrentPage] = useState("overview");
  const [editingElectionId, setEditingElectionId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [elections, setElections] = useState<AdminElection[]>([
    {
      id: "1",
      title: "Presidential Election 2026",
      status: "active",
      startTime: new Date(Date.now() - 7200000),
      endTime: new Date(Date.now() + 604800000),
      registeredVoters: 2500000,
      votesReceived: 1850000,
    },
    {
      id: "2",
      title: "Board of Directors 2026",
      status: "closed",
      startTime: new Date(Date.now() - 2592000000),
      endTime: new Date(Date.now() - 1209600000),
      registeredVoters: 45000,
      votesReceived: 38600,
    },
    {
      id: "3",
      title: "Local Council Elections",
      status: "scheduled",
      startTime: new Date(Date.now() + 2592000000),
      endTime: new Date(Date.now() + 3196800000),
      registeredVoters: 350000,
      votesReceived: 0,
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const activeElections = elections.filter((e) => e.status === "active").length;
  const totalVoters = elections.reduce((sum, e) => sum + e.registeredVoters, 0);
  const totalVotes = elections.reduce((sum, e) => sum + e.votesReceived, 0);
  const averageTurnout = totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(2) : "0";

  const handleEditElection = (id: string) => {
    const election = elections.find((e) => e.id === id);
    if (election) {
      setEditingElectionId(id);
      setEditFormData({ ...election });
    }
  };

  const handleSaveEditElection = () => {
    if (editFormData) {
      setElections((prev) =>
        prev.map((e) => (e.id === editingElectionId ? editFormData : e))
      );
      setEditingElectionId(null);
      setEditFormData(null);
      info("Election updated successfully", "Success");
    }
  };

  const handleStartElection = (id: string) => {
    setElections((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "active" as const } : e))
    );
  };

  const handleStopElection = (id: string) => {
    setElections((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "closed" as const } : e))
    );
  };

  const handleDeleteElection = (id: string) => {
    setElections((prev) => prev.filter((e) => e.id !== id));
    setShowDeleteConfirm(null);
  };

  return (
    <AdminLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      userEmail="admin@election.local"
      onLogout={() => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        navigate("/");
      }}
    >
      {currentPage === "overview" && (
        <>
          {/* Page Title */}
          <h1 style={{ margin: "0 0 32px", fontSize: "32px", fontWeight: 800 }}>
            Admin Dashboard
          </h1>

          {/* Key Metrics */}
          <Section title="System Overview">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
                marginBottom: "40px",
              }}
            >
              <Card>
                <Metric
                  label="Active Elections"
                  value={activeElections}
                  subtext="Currently running"
                  icon={<BarChart3 size={18} />}
                />
              </Card>

              <Card>
                <Metric
                  label="Total Registered Voters"
                  value={totalVoters.toLocaleString()}
                  subtext="Across all elections"
                  icon={<Users size={18} />}
                />
              </Card>

              <Card>
                <Metric
                  label="Total Votes Cast"
                  value={totalVotes.toLocaleString()}
                  subtext="Across all time"
                  icon={<TrendingUp size={18} />}
                />
              </Card>

              <Card>
                <Metric
                  label="Average Turnout"
                  value={`${averageTurnout}%`}
                  subtext="Across active elections"
                  icon={<TrendingUp size={18} />}
                />
              </Card>
            </div>
          </Section>

          {/* System Health */}
          <Section title="System Monitoring">
            <SystemHealth
              cpuUsage={34}
              memoryUsage={42}
              activeConnections={12847}
              databaseStatus="healthy"
              encryptionStatus="active"
              lastAuditTime={new Date(Date.now() - 1800000)}
            />
          </Section>

          {/* Security Alerts */}
          <Section title="Security Alerts">
            <Alert
              variant="info"
              title="All Systems Nominal"
              message="No security alerts. All encryption and audit systems operational. Last penetration test: 7 days ago."
            />
          </Section>

          {/* Elections Management */}
          <Section
            title="Election Management"
            description="Manage active elections and view results."
          >
            <div
              style={{
                display: "grid",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <button
                className="govBtn govBtnPrimary"
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: "12px 16px",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                + Create New Election
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                gap: "16px",
              }}
            >
              {elections.map((election) => (
                <AdminElectionCard
                  key={election.id}
                  {...election}
                  onEdit={handleEditElection}
                  onStart={handleStartElection}
                  onStop={handleStopElection}
                  onDelete={() => setShowDeleteConfirm(election.id)}
                />
              ))}
            </div>
          </Section>
        </>
      )}

      {currentPage === "create-election" && (
        <>
          <h1 style={{ margin: "0 0 32px", fontSize: "32px", fontWeight: 800 }}>
            Create New Election
          </h1>

          <Section title="Election Details">
            <Card>
              <form className="govForm" style={{ maxWidth: "500px" }}>
                <label className="govLabel">
                  <span>Election Title *</span>
                  <input type="text" className="govInput" placeholder="e.g., Board of Directors 2026" />
                </label>

                <label className="govLabel">
                  <span>Description</span>
                  <textarea
                    className="govInput"
                    placeholder="Optional description..."
                    rows={3}
                    style={{ resize: "vertical" }}
                  />
                </label>

                <label className="govLabel">
                  <span>Start Date & Time *</span>
                  <input type="datetime-local" className="govInput" />
                </label>

                <label className="govLabel">
                  <span>End Date & Time *</span>
                  <input type="datetime-local" className="govInput" />
                </label>

                <label className="govLabel">
                  <span>Expected Voters *</span>
                  <input type="number" className="govInput" placeholder="0" />
                </label>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button type="button" className="govBtn" onClick={() => setCurrentPage("overview")}>
                    Cancel
                  </button>
                  <button type="submit" className="govBtn govBtnPrimary">
                    Create Election
                  </button>
                </div>
              </form>
            </Card>
          </Section>
        </>
      )}

      {currentPage === "elections" && (
        <>
          <h1 style={{ margin: "0 0 32px", fontSize: "32px", fontWeight: 800 }}>
            Manage Elections
          </h1>

          <Section title="All Elections">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                gap: "16px",
              }}
            >
              {elections.map((election) => (
                <AdminElectionCard
                  key={election.id}
                  {...election}
                  onEdit={handleEditElection}
                  onStart={handleStartElection}
                  onStop={handleStopElection}
                  onDelete={() => setShowDeleteConfirm(election.id)}
                />
              ))}
            </div>
          </Section>
        </>
      )}

      {currentPage === "audit" && (
        <>
          <h1 style={{ margin: "0 0 32px", fontSize: "32px", fontWeight: 800 }}>
            Audit Logs
          </h1>

          <Section title="System Audit Events">
            <Card>
              <div style={{ display: "grid", gap: "12px" }}>
                {[
                  { timestamp: new Date(Date.now() - 300000), event: "LOGIN", actor: "admin@election.local", role: "admin" },
                  { timestamp: new Date(Date.now() - 600000), event: "VOTE_CAST", actor: "anonymous", role: "system" },
                  {
                    timestamp: new Date(Date.now() - 1200000),
                    event: "ELECTION_START",
                    actor: "admin@election.local",
                    role: "admin",
                  },
                  {
                    timestamp: new Date(Date.now() - 1800000),
                    event: "KEY_ROTATION",
                    actor: "system",
                    role: "system",
                  },
                ].map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.03)",
                      borderBottom: idx < 3 ? "1px solid var(--gov-edge)" : "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>
                        {log.event.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                        {log.actor} ({log.role})
                      </div>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
                      {log.timestamp.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Section>
        </>
      )}

      {currentPage === "status" && (
        <>
          <h1 style={{ margin: "0 0 32px", fontSize: "32px", fontWeight: 800 }}>
            System Status
          </h1>

          <Section title="Infrastructure Health">
            <SystemHealth
              cpuUsage={34}
              memoryUsage={42}
              activeConnections={12847}
              databaseStatus="healthy"
              encryptionStatus="active"
              lastAuditTime={new Date(Date.now() - 1800000)}
            />
          </Section>
        </>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Election"
        description="Set up a new election with candidates and voter eligibility rules."
        footer={[
          <Button key="cancel" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>,
          <Button key="create" variant="primary">
            Create Election
          </Button>,
        ]}
      >
        <div className="govForm" style={{ display: "grid", gap: "12px" }}>
          <label className="govLabel">
            <span>Election Title</span>
            <input type="text" className="govInput" placeholder="e.g., Board of Directors 2026" />
          </label>

          <label className="govLabel">
            <span>Start Date</span>
            <input type="datetime-local" className="govInput" />
          </label>

          <label className="govLabel">
            <span>End Date</span>
            <input type="datetime-local" className="govInput" />
          </label>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Election?"
        description="This action cannot be undone."
        footer={[
          <Button key="cancel" onClick={() => setShowDeleteConfirm(null)}>
            Cancel
          </Button>,
          <Button
            key="delete"
            variant="danger"
            onClick={() => showDeleteConfirm && handleDeleteElection(showDeleteConfirm)}
          >
            Delete
          </Button>,
        ]}
      >
        <Alert
          variant="error"
          message="Are you sure you want to delete this election? All associated votes and audit logs will be permanently removed."
        />
      </Modal>

      {/* Edit Election Overlay Modal */}
      {editingElectionId && editFormData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setEditingElectionId(null)}
        >
          <div
            style={{
              background: "var(--gov-card)",
              border: "1px solid var(--gov-edge)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>
                Edit Election
              </h2>
              <button
                onClick={() => setEditingElectionId(null)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  fontSize: "24px",
                  color: "var(--gov-muted)",
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Edit Form */}
            <div style={{ display: "grid", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}
                >
                  Election Title
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid var(--gov-edge)",
                    borderRadius: "8px",
                    background: "var(--gov-bg)",
                    color: "var(--gov-ink)",
                    fontSize: "13px",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}
                >
                  Registered Voters
                </label>
                <input
                  type="number"
                  value={editFormData.registeredVoters}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      registeredVoters: parseInt(e.target.value),
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid var(--gov-edge)",
                    borderRadius: "8px",
                    background: "var(--gov-bg)",
                    color: "var(--gov-ink)",
                    fontSize: "13px",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}
                >
                  Votes Received
                </label>
                <input
                  type="number"
                  value={editFormData.votesReceived}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      votesReceived: parseInt(e.target.value),
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid var(--gov-edge)",
                    borderRadius: "8px",
                    background: "var(--gov-bg)",
                    color: "var(--gov-ink)",
                    fontSize: "13px",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditingElectionId(null)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid var(--gov-edge)",
                  background: "transparent",
                  color: "var(--gov-ink)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditElection}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "rgba(201,162,39,0.62)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
