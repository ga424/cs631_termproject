import { useAuth } from "../contexts/AuthContext";

export function ProfileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
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
          <div className="profile-avatar">{session.username.charAt(0).toUpperCase()}</div>
          <div>
            <p className="eyebrow">{session.role}</p>
            <h2 id="profile-title">{session.username}</h2>
            <span>{session.token_type} session</span>
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

        <div className="profile-section accent">
          <strong>Milan Rent-A-Car</strong>
          <p>Role-separated rental operations for booking, pickup, return, branch visibility, and fleet governance.</p>
        </div>

        <button type="button" className="danger-mini full-width" onClick={signOut}>Sign Out</button>
      </aside>
    </div>
  );
}
