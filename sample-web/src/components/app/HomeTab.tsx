import { fallbackAvatar, formatCurrency } from "../../lib/ui";
import type { DashboardResponse, User } from "../../types";
import { ExpenseItem } from "./ExpenseItem";
import { MetricCard } from "./MetricCard";

interface HomeTabProps {
  dashboard: DashboardResponse | null;
  onAddExpense: () => void;
  user: User;
}

export function HomeTab({ dashboard, onAddExpense, user }: HomeTabProps) {
  return (
    <div className="tab-stack">
      <section className="hero-card home-hero-card">
        <div className="hero-row">
          <div className="hero-copy">
            <p className="hero-subtitle">Xin chào, {user.fullName}</p>
            <h2>Tổng quan chi tiêu hôm nay</h2>
            <p className="hero-note">Tạo khoản chi mới thật nhanh và theo dõi số liệu trong ngày.</p>
          </div>
          <img className="hero-avatar" alt={user.fullName} src={user.avatarUrl || fallbackAvatar(user.fullName)} />
        </div>
        <button className="primary-button" onClick={onAddExpense} type="button">
          Thêm khoản chi mới
        </button>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Chi tháng này" value={formatCurrency(dashboard?.monthTotal || 0)} />
        <MetricCard label="Chi hôm nay" value={formatCurrency(dashboard?.todayTotal || 0)} />
        <MetricCard label="Số khoản chi" value={String(dashboard?.monthExpenseCount || 0)} />
        <MetricCard
          label="Chi nhiều nhất"
          value={dashboard?.topPayerName ? `${dashboard.topPayerName} · ${formatCurrency(dashboard.topPayerAmount)}` : "Chưa có"}
        />
      </section>

      <section className="panel-card compact-panel">
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
