import { AppIcon } from "./AppIcon";
import { NAV_ITEMS, type TabKey } from "./nav";

interface BottomNavProps {
  activeTab: TabKey;
  onSelect: (tab: TabKey) => void;
}

export function BottomNav({ activeTab, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Điều hướng chính">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          aria-label={item.label}
          className={activeTab === item.key ? "bottom-nav-item active" : "bottom-nav-item"}
          onClick={() => onSelect(item.key)}
          title={item.label}
          type="button"
        >
          <AppIcon name={item.icon} />
          <span className="sr-only">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
