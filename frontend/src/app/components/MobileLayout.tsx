import { useState } from "react";
import { BottomNav, type BottomNavItem } from "./BottomNav";
import { ProfileDrawer, type ProfileDrawerSection } from "./ProfileDrawer";

export function MobileLayout({
  title,
  subtitle,
  role,
  tabs,
  activeTab,
  onTabChange,
  onSignOut,
  profileInitials,
  profileTitle,
  profileSubtitle,
  profileSections,
  children,
}: {
  title: string;
  subtitle: string;
  role: string;
  tabs: BottomNavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onSignOut: () => void;
  profileInitials?: string;
  profileTitle?: string;
  profileSubtitle?: string;
  profileSections?: ProfileDrawerSection[];
  children: React.ReactNode;
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className={`app-shell role-${role}`}>
      <header className="mobile-hero role-hero">
        <div>
          <p className="eyebrow">{role.toUpperCase()}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="hero-actions">
          <button type="button" className="profile-button" aria-label="Open profile" onClick={() => setProfileOpen(true)}>
            {profileInitials || role.slice(0, 1).toUpperCase()}
          </button>
          <button type="button" className="ghost-button" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      </header>
      <main className="mobile-main">{children}</main>
      <BottomNav items={tabs} activeTab={activeTab} onTabChange={onTabChange} />
      <ProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        initials={profileInitials}
        title={profileTitle}
        subtitle={profileSubtitle}
        sections={profileSections}
      />
    </div>
  );
}
