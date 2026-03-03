import { useNotification } from "../../context/NotificationContext";
import type { Notification } from "../../context/NotificationContext";

export default function NotificationContainer() {
  const { notifications, dismiss } = useNotification();

  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    success: { bg: "rgba(71,167,111,0.1)", border: "rgba(71,167,111,0.3)", text: "#47a76f" },
    error: { bg: "rgba(255,107,107,0.1)", border: "rgba(255,107,107,0.3)", text: "#ff6b6b" },
    warning: { bg: "rgba(217,119,6,0.1)", border: "rgba(217,119,6,0.3)", text: "#d97706" },
    info: { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)", text: "#3b82f6" },
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        maxWidth: "400px",
        pointerEvents: "none",
      }}
    >
      {notifications.map((notif: Notification) => {
        const colors = colorMap[notif.type];
        return (
          <div
            key={notif.id}
            style={{
              padding: "16px 16px",
              borderRadius: "12px",
              border: `1px solid ${colors.border}`,
              background: colors.bg,
              color: colors.text,
              pointerEvents: "auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "12px",
              animation: "slideIn 0.3s ease-out",
            }}
          >
            <div>
              {notif.title && (
                <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "14px" }}>
                  {notif.title}
                </p>
              )}
              <p style={{ margin: 0, fontSize: "13px" }}>{notif.message}</p>
            </div>
            <button
              onClick={() => dismiss(notif.id)}
              style={{
                all: "unset",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "bold",
                opacity: 0.6,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
            >
              ×
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
