import type { NavIconKey } from "./nav";

export function AppIcon({ name }: { name: NavIconKey }) {
  switch (name) {
    case "home":
      return (
        <svg aria-hidden="true" className="nav-icon" viewBox="0 0 24 24">
          <path
            d="M4 11.5 12 5l8 6.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
          <path
            d="M6.5 10.5V19h11v-8.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
        </svg>
      );
    case "receipt":
      return (
        <svg aria-hidden="true" className="nav-icon" viewBox="0 0 24 24">
          <path
            d="M7 4.5h10v15l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4V4.5Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.9"
          />
          <path d="M9 9h6M9 12.5h6M9 16h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
        </svg>
      );
    case "chart":
      return (
        <svg aria-hidden="true" className="nav-icon" viewBox="0 0 24 24">
          <path d="M5 19.5h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
          <path d="M8 17V11m4 6V7m4 10v-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
        </svg>
      );
    case "user":
      return (
        <svg aria-hidden="true" className="nav-icon" viewBox="0 0 24 24">
          <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
        </svg>
      );
    default:
      return null;
  }
}
