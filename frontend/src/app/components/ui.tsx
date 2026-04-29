import { useState, useEffect } from "react";
import { formatCurrency, formatPercent } from "../lib/api";
import type { WorkflowStage } from "../lib/types";

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card">
      <div className="surface-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function AlertStrip({ error, success }: { error?: string; success?: string }) {
  const [visibleNotifications, setVisibleNotifications] = useState<Set<string>>(new Set());

  const notifications = [
    ...(error ? [{ id: "error", tone: "error", title: "Action needed", message: error }] : []),
    ...(success ? [{ id: "success", tone: "success", title: "Update saved", message: success }] : []),
  ];

  useEffect(() => {
    setVisibleNotifications(new Set(notifications.map((n) => n.id)));
  }, [error, success]);

  const handleClose = (id: string) => {
    const updated = new Set(visibleNotifications);
    updated.delete(id);
    setVisibleNotifications(updated);
  };

  const visibleNotificationsList = notifications.filter((n) => visibleNotifications.has(n.id));

  if (!visibleNotificationsList.length) {
    return null;
  }

  return (
    <div className="notification-stack" aria-live="polite">
      {visibleNotificationsList.map((notification) => (
        <div
          key={notification.id}
          className={`notification-banner ${notification.tone}`}
          role={notification.tone === "error" ? "alert" : "status"}
        >
          <div className="notification-icon" aria-hidden="true">
            {notification.tone === "error" ? "!" : "OK"}
          </div>
          <div>
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="notification-close"
            aria-label={`Close ${notification.tone} notification`}
            onClick={() => handleClose(notification.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function StatGrid({
  stats,
}: {
  stats: Array<{ label: string; value: string | number }>;
}) {
  return (
    <div className="stat-grid">
      {stats.map((stat) => (
        <article key={stat.label} className="stat-tile">
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
        </article>
      ))}
    </div>
  );
}

export function QueueList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{ id: string; title: string; subtitle: string; meta?: string }>;
  emptyText: string;
}) {
  return (
    <div className="queue-card">
      <h3>{title}</h3>
      {items.length ? (
        <ul className="stack-list">
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.subtitle}</p>
              {item.meta ? <span>{item.meta}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-block">{emptyText}</div>
      )}
    </div>
  );
}

export function WorkflowTracker({
  stages,
  activeIndex,
  title,
}: {
  stages: WorkflowStage[];
  activeIndex: number;
  title: string;
}) {
  return (
    <div className="tracker-card">
      <h3>{title}</h3>
      <ol className="workflow-list">
        {stages.map((stage, index) => (
          <li key={stage.stage_id} className={index <= activeIndex ? "workflow-step active" : "workflow-step"}>
            <div className="workflow-bullet">{index + 1}</div>
            <div>
              <strong>{stage.label}</strong>
              <p>{stage.description}</p>
              <span>{stage.owner_role}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MetricSummary({
  utilization,
  totalCars,
  activeReservations,
}: {
  utilization: number;
  totalCars: number;
  activeReservations: number;
}) {
  return (
    <div className="surface-card mini-metrics">
      <div>
        <strong>{formatPercent(utilization)}</strong>
        <span>Utilization</span>
      </div>
      <div>
        <strong>{totalCars}</strong>
        <span>Total Fleet</span>
      </div>
      <div>
        <strong>{activeReservations}</strong>
        <span>Active Reservations</span>
      </div>
    </div>
  );
}

export function PricingChips({
  items,
}: {
  items: Array<{ id: string; label: string; daily: number; weekly: number }>;
}) {
  return (
    <div className="chip-grid">
      {items.map((item) => (
        <article key={item.id} className="chip-card">
          <strong>{item.label}</strong>
          <span>{formatCurrency(item.daily)}/day</span>
          <span>{formatCurrency(item.weekly)}/week</span>
        </article>
      ))}
    </div>
  );
}
