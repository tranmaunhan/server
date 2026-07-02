export type TabKey = "home" | "expenses" | "reports" | "account";
export type NavIconKey = "home" | "receipt" | "chart" | "user";

export const NAV_ITEMS: Array<{ icon: NavIconKey; key: TabKey; label: string }> = [
  { key: "home", label: "Trang chủ", icon: "home" },
  { key: "expenses", label: "Khoản chi", icon: "receipt" },
  { key: "reports", label: "Báo cáo", icon: "chart" },
  { key: "account", label: "Tài khoản", icon: "user" }
];

export function tabTitle(tab: TabKey) {
  switch (tab) {
    case "home":
      return "Trang chủ";
    case "expenses":
      return "Khoản chi";
    case "reports":
      return "Báo cáo";
    case "account":
      return "Tài khoản";
    default:
      return "A1.403";
  }
}
