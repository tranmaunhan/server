import { formatCurrency } from "../../lib/ui";
import type { MonthlyReport, Settlement, SettlementStatus } from "../../types";
import { MetricCard } from "./MetricCard";

interface ReportsTabProps {
  month: number;
  onGenerateSettlements: () => void;
  onPeriodChange: (year: number, month: number) => void;
  onSettlementStatus: (settlementId: number, status: SettlementStatus) => void;
  report: MonthlyReport | null;
  settlements: Settlement[];
  year: number;
}

export function ReportsTab({
  month,
  onGenerateSettlements,
  onPeriodChange,
  onSettlementStatus,
  report,
  settlements,
  year
}: ReportsTabProps) {
  return (
    <div className="tab-stack">
      <section className="panel-card compact-panel">
        <div className="panel-heading compact-heading">
          <div>
            <p className="eyebrow">Báo cáo tháng</p>
            <h3>Tổng quan chi tiêu</h3>
          </div>
          <div className="period-controls">
            <select value={month} onChange={(event) => onPeriodChange(year, Number(event.target.value))}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                <option key={item} value={item}>
                  Tháng {item}
                </option>
              ))}
            </select>
            <input type="number" value={year} onChange={(event) => onPeriodChange(Number(event.target.value), month)} />
          </div>
        </div>

        <div className="metrics-grid">
          <MetricCard label="Tổng đã chi" value={formatCurrency(report?.totalExpenseAmount || 0)} />
          <MetricCard label="Số khoản chi" value={String(report?.totalExpenseCount || 0)} />
        </div>

        <div className="list-stack">
          {report?.members.map((member) => (
            <article className="member-balance-card" key={member.userId}>
              <div className="member-balance-main">
                <strong>{member.fullName}</strong>
                <div className="inline-meta">
                  <p>Đã thanh toán: {formatCurrency(member.paidAmount)}</p>
                  <p>Phải chịu: {formatCurrency(member.shareAmount)}</p>
                </div>
              </div>
              <span className={member.balance >= 0 ? "balance-pill positive" : "balance-pill negative"}>
                {member.balance >= 0 ? "+" : ""}
                {formatCurrency(member.balance)}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-card compact-panel">
        <div className="panel-heading compact-heading">
          <div>
            <p className="eyebrow">Gợi ý chuyển tiền</p>
            <h3>Quyết toán cuối tháng</h3>
          </div>
          <button className="secondary-button" onClick={onGenerateSettlements} type="button">
            Tạo
          </button>
        </div>

        <div className="list-stack">
          {report?.suggestions.map((item, index) => (
            <article className="settlement-suggestion-card" key={`${item.fromUserId}-${item.toUserId}-${index}`}>
              <strong>{item.fromUserName}</strong>
              <span>chuyển</span>
              <strong>{formatCurrency(item.amount)}</strong>
              <span>cho</span>
              <strong>{item.toUserName}</strong>
            </article>
          ))}
          {!report?.suggestions?.length && <p className="muted-text">Tháng này chưa cần tạo quyết toán.</p>}
        </div>
      </section>

      <section className="panel-card compact-panel">
        <div className="panel-heading compact-heading">
          <div>
            <p className="eyebrow">Danh sách quyết toán</p>
            <h3>Trạng thái thanh toán</h3>
          </div>
        </div>

        <div className="list-stack">
          {settlements.map((settlement) => (
            <article className="settlement-card" key={settlement.id}>
              <div className="settlement-main">
                <strong>
                  {settlement.fromUserName} → {settlement.toUserName}
                </strong>
                <p className="settlement-amount-text">{formatCurrency(settlement.amount)}</p>
              </div>
              <button
                className={settlement.status === "PAID" ? "secondary-button paid" : "secondary-button"}
                onClick={() =>
                  onSettlementStatus(settlement.id, settlement.status === "PAID" ? "PENDING" : "PAID")
                }
                type="button"
              >
                {settlement.status === "PAID" ? "Đã thanh toán" : "Chờ thanh toán"}
              </button>
            </article>
          ))}
          {!settlements.length && <p className="muted-text">Chưa có bản ghi quyết toán nào.</p>}
        </div>
      </section>
    </div>
  );
}
