import { useAuth } from "../contexts/AuthContext";

export type ProfileDrawerItem = {
  label: string;
  value: string;
};

export type ProfileDrawerSection = {
  title: string;
  description?: string;
  items?: ProfileDrawerItem[];
  accent?: boolean;
};

export function ProfileDrawer({
  open,
  onClose,
  initials,
  title,
  subtitle,
  sections = [],
}: {
  open: boolean;
  onClose: () => void;
  initials?: string;
  title?: string;
  subtitle?: string;
  sections?: ProfileDrawerSection[];
}) {
  const { session, logout } = useAuth();

  if (!open || !session) {
    return null;
  }

  function signOut() {
    logout();
    onClose();
  }

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="profile-drawer" role="dialog" aria-modal="true" aria-labelledby="profile-title" onClick={(event) => event.stopPropagation()}>
        <div className="profile-head">
          <div className="profile-avatar">{initials || session.username.charAt(0).toUpperCase()}</div>
          <div>
            <p className="eyebrow">{session.role}</p>
            <h2 id="profile-title">{title || session.username}</h2>
            <span>{subtitle || `${session.token_type} session`}</span>
          </div>
          <button type="button" className="icon-button" aria-label="Close profile" onClick={onClose}>×</button>
        </div>

        <div className="profile-section">
          <strong>Role Assignment</strong>
          <dl>
            <div><dt>Workspace</dt><dd>{session.role === "admin" ? "Rental Admin Console" : `${session.role.charAt(0).toUpperCase()}${session.role.slice(1)} Surface`}</dd></div>
            <div><dt>Access</dt><dd>{session.role === "customer" ? "Self-service" : session.role === "admin" ? "Configuration and governance" : "Staff operations"}</dd></div>
          </dl>
        </div>

        {sections.map((section) => (
          <div key={section.title} className={`profile-section${section.accent ? " accent" : ""}`}>
            <strong>{section.title}</strong>
            {section.description ? <p>{section.description}</p> : null}
            {section.items?.length ? (
              <dl>
                {section.items.map((item) => (
                  <div key={`${section.title}-${item.label}`}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ))}

        <div className="profile-section accent">
          <strong>Milan Rent-A-Car</strong>
          <p>Role-separated rental operations for booking, pickup, return, branch visibility, and fleet governance.</p>
        </div>

        <button type="button" className="danger-mini full-width" onClick={signOut}>Sign Out</button>
      </aside>
    </div>
  );
}
