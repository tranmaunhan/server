import { fallbackAvatar, formatCurrency } from "../../lib/ui";
import type { DashboardResponse, User } from "../../types";
import { ExpenseItem } from "./ExpenseItem";

interface HomeTabProps {
  dashboard: DashboardResponse | null;
  onAddExpense: () => void;
  user: User;
}

export function HomeTab({ dashboard, onAddExpense, user }: HomeTabProps) {
  const monthTotal = dashboard?.monthTotal || 0;
  const todayTotal = dashboard?.todayTotal || 0;
  const topPayerLabel = dashboard?.topPayerName
    ? `${dashboard.topPayerName} · ${formatCurrency(dashboard.topPayerAmount)}`
    : "Chưa có dữ liệu";

  return (
    <div className="tab-stack">
      <section className="panel-card home-overview-card compact-home-hero">
        <div className="home-overview-head">
          <div className="home-overview-copy">
            <p className="eyebrow">A1.403</p>
            <h2>Chào {user.fullName}</h2>
          </div>
          <img
            alt={user.fullName}
            className="home-overview-avatar"
            src={user.avatarUrl || fallbackAvatar(user.fullName)}
          />
        </div>

        <div className="home-overview-grid">
          <article className="home-amount-card major">
            <span>Chi tháng này</span>
            <strong>{formatCurrency(monthTotal)}</strong>
          </article>

          <article className="home-amount-card minor">
            <span>Chi hôm nay</span>
            <strong>{formatCurrency(todayTotal)}</strong>
          </article>
        </div>

        <div className="home-insights-grid">
          <article className="home-insight-pill">
            <span>Số khoản chi</span>
            <strong>{dashboard?.monthExpenseCount || 0}</strong>
          </article>

          <article className="home-insight-pill wide">
            <span>Người chi nhiều nhất</span>
            <strong>{topPayerLabel}</strong>
          </article>
        </div>

        <button className="primary-button home-cta-button compact" onClick={onAddExpense} type="button">
          Thêm khoản chi mới
        </button>
      </section>

      <section className="panel-card compact-panel home-recent-panel">
        <div className="panel-heading compact-heading">
          <div>
            <p className="eyebrow">Gần đây</p>
            <h3>Khoản chi mới nhất</h3>
          </div>
        </div>

        <div className="list-stack">
          {(dashboard?.recentExpenses || []).map((expense) => (
            <ExpenseItem key={expense.id} compact expense={expense} />
          ))}
          {!dashboard?.recentExpenses?.length && <p className="muted-text">Chưa có khoản chi nào trong tháng này.</p>}
        </div>
      </section>
    </div>
  );
}
