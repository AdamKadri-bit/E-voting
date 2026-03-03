import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration: number;
}

interface NotificationContextType {
  notifications: Notification[];
  notify: (type: NotificationType, message: string, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (
    type: NotificationType,
    message: string,
    title?: string,
    duration = 4000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: Notification = { id, type, title, message, duration };

    setNotifications((prev) => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  };

  const success = (message: string, title?: string) =>
    notify("success", message, title || "Success");
  const error = (message: string, title?: string) =>
    notify("error", message, title || "Error");
  const warning = (message: string, title?: string) =>
    notify("warning", message, title || "Warning");
  const info = (message: string, title?: string) =>
    notify("info", message, title || "Info");

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, notify, success, error, warning, info, dismiss }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
