"use client";

import { ProtocolNotification } from "../lib/types";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: ProtocolNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationDrawerProps) {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getTypeIcon = (type: ProtocolNotification["type"]) => {
    switch (type) {
      case "milestone":
        return { icon: "verified", color: "var(--primary-container)" };
      case "grant":
        return { icon: "rocket_launch", color: "var(--accent-purple)" };
      case "guard":
        return { icon: "shield", color: "#10b981" };
      case "web3":
        return { icon: "cloud_done", color: "var(--accent-blue)" };
      default:
        return { icon: "info", color: "var(--text-secondary)" };
    }
  };

  return (
    <div className="modal-backdrop-blur" onClick={onClose}>
      <div
        className="notification-drawer-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--primary-pill-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary-pill-text)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                notifications_active
              </span>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: 16, fontWeight: 700, color: "var(--text-dark)" }}>
                Protocol Notifications
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>
                {unreadCount > 0 ? `${unreadCount} unread protocol updates` : "All notifications read"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--primary)",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                Mark read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "var(--bg-container)",
                border: "none",
                borderRadius: "50%",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* List of Notifications */}
        <div className="drawer-body">
          {notifications.map((item) => {
            const { icon, color } = getTypeIcon(item.type);
            return (
              <div
                key={item.id}
                onClick={() => onMarkAsRead(item.id)}
                className={`notification-item ${!item.isRead ? "unread" : ""}`}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                      {icon}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dark)" }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {item.timestamp}
                      </span>
                    </div>

                    <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                      {item.message}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: item.type === "milestone" ? "var(--primary-pill-bg)" : "var(--bg-container)",
                            color: item.type === "milestone" ? "var(--primary-pill-text)" : "var(--text-secondary)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {item.badge}
                        </span>
                      )}

                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--primary)",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <span>{item.linkText || "View On-Chain"}</span>
                          <span style={{ fontSize: 11 }}>↗</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary-container)" }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Direct on-chain events synced from BOT Chain & Base
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
