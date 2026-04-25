export type BottomNavItem = {
  id: string;
  label: string;
};

export function BottomNav({
  items,
  activeTab,
  onTabChange,
}: {
  items: BottomNavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={activeTab === item.id ? "nav-pill active" : "nav-pill"}
          onClick={() => onTabChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
