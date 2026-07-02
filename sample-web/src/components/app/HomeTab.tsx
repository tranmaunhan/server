import { formatCurrency } from "../../lib/ui";
import type { DashboardResponse, User } from "../../types";
import { ExpenseItem } from "./ExpenseItem";

interface HomeTabProps {
  dashboard: DashboardResponse | null;
  user: User;
}

export function HomeTab({ dashboard, user }: HomeTabProps) {
  const monthTotal = dashboard?.monthTotal || 0;
  const todayTotal = dashboard?.todayTotal || 0;
  const expenseCount = dashboard?.monthExpenseCount || 0;

  return (
    <div className="tab-stack">
      <section className="panel-card home-overview-card wallet-home-card">
        <div className="wallet-home-top">
          <div>
            <p className="eyebrow">A1.403 Home</p>
            <h2>{user.fullName}</h2>
          </div>
          <span className="wallet-home-chip">Tháng này</span>
        </div>

        <div className="wallet-home-main">
          <article className="wallet-home-stat primary">
            <span>Chi tháng này</span>
            <strong>{formatCurrency(monthTotal)}</strong>
          </article>

          <div className="wallet-home-side">
            <article className="wallet-home-stat secondary">
              <span>Chi hôm nay</span>
              <strong>{formatCurrency(todayTotal)}</strong>
            </article>

            <article className="wallet-home-stat secondary">
              <span>Số khoản chi</span>
              <strong>{expenseCount}</strong>
            </article>
          </div>
        </div>
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
