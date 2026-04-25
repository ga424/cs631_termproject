import { BottomNav, type BottomNavItem } from "./BottomNav";

export function MobileLayout({
  title,
  subtitle,
  role,
  tabs,
  activeTab,
  onTabChange,
  onSignOut,
  children,
}: {
  title: string;
  subtitle: string;
  role: string;
  tabs: BottomNavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="mobile-hero">
        <div>
          <p className="eyebrow">{role.toUpperCase()}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onSignOut}>
          Sign Out
        </button>
      </header>
      <main className="mobile-main">{children}</main>
      <BottomNav items={tabs} activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
