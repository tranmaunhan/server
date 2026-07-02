import { formatCurrency, formatDate } from "../../lib/ui";
import type { MonthlyReport, Settlement, User } from "../../types";
import { MetricCard } from "./MetricCard";

interface ReportsTabProps {
  currentUser: User;
  month: number;
  onGenerateSettlements: () => void;
  onPeriodChange: (year: number, month: number) => void;
  onSettlementStatus: (settlementId: number) => void;
  report: MonthlyReport | null;
  settlements: Settlement[];
  year: number;
}

interface SettlementGroup {
  dateKey: string;
  label: string;
  settlements: Settlement[];
}

export function ReportsTab({
  currentUser,
  month,
  onGenerateSettlements,
  onPeriodChange,
  onSettlementStatus,
  report,
  settlements,
  year
}: ReportsTabProps) {
  const pendingSettlements = settlements
    .filter((settlement) => settlement.status === "PENDING")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const completedGroups = groupCompletedSettlements(settlements);

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
            <p className="eyebrow">Trạng thái thanh toán</p>
            <h3>Theo dõi theo ngày hoàn tất</h3>
          </div>
        </div>

        <div className="settlement-sections">
          {!!pendingSettlements.length && (
            <section className="settlement-group">
              <div className="settlement-group-header">
                <strong>Đang chờ xác nhận</strong>
                <span>{pendingSettlements.length} khoản</span>
              </div>
              <div className="list-stack">
                {pendingSettlements.map((settlement) => (
                  <SettlementCard
                    currentUser={currentUser}
                    key={settlement.id}
                    onConfirm={onSettlementStatus}
                    settlement={settlement}
                  />
                ))}
              </div>
            </section>
          )}

          {completedGroups.map((group) => (
            <section className="settlement-group" key={group.dateKey}>
              <div className="settlement-group-header">
                <strong>{group.label}</strong>
                <span>{group.settlements.length} khoản</span>
              </div>
              <div className="list-stack">
                {group.settlements.map((settlement) => (
                  <SettlementCard
                    currentUser={currentUser}
                    key={settlement.id}
                    onConfirm={onSettlementStatus}
                    settlement={settlement}
                  />
                ))}
              </div>
            </section>
          ))}

          {!settlements.length && <p className="muted-text">Chưa có bản ghi quyết toán nào.</p>}
        </div>
      </section>
    </div>
  );
}

interface SettlementCardProps {
  currentUser: User;
  onConfirm: (settlementId: number) => void;
  settlement: Settlement;
}

function SettlementCard({ currentUser, onConfirm, settlement }: SettlementCardProps) {
  const isReceiver = currentUser.id === settlement.toUserId;
  const isSender = currentUser.id === settlement.fromUserId;
  const isCompleted = settlement.status === "PAID";
  const infoText = isCompleted
    ? `Đã hoàn tất ngày ${formatDate(settlement.paidAt || settlement.createdAt)}`
    : `Tạo ngày ${formatDate(settlement.createdAt)}`;
  const roleText = isReceiver ? "Bạn là người nhận" : isSender ? "Bạn là người chuyển" : "Giao dịch trong nhóm";

  return (
    <article className="settlement-card">
      <div className="settlement-main">
        <strong>
          {settlement.fromUserName} chuyển cho {settlement.toUserName}
        </strong>
        <p className="settlement-amount-text">{formatCurrency(settlement.amount)}</p>
        <div className="inline-meta settlement-meta">
          <p>{roleText}</p>
          <p>{infoText}</p>
        </div>
      </div>

      {isReceiver && !isCompleted ? (
        <button className="secondary-button paid" onClick={() => onConfirm(settlement.id)} type="button">
          Đã nhận
        </button>
      ) : (
        <span className={isCompleted ? "settlement-state-pill done" : "settlement-state-pill pending"}>
          {isCompleted ? "Đã hoàn tất" : "Chờ người nhận xác nhận"}
        </span>
      )}
    </article>
  );
}

function groupCompletedSettlements(settlements: Settlement[]) {
  const groups = new Map<string, SettlementGroup>();

  settlements
    .filter((settlement) => settlement.status === "PAID")
    .sort((left, right) => (right.paidAt || right.createdAt).localeCompare(left.paidAt || left.createdAt))
    .forEach((settlement) => {
      const sourceDate = settlement.paidAt || settlement.createdAt;
      const dateKey = sourceDate.slice(0, 10);
      const existingGroup = groups.get(dateKey);

      if (existingGroup) {
        existingGroup.settlements.push(settlement);
        return;
      }

      groups.set(dateKey, {
        dateKey,
        label: formatDate(sourceDate),
        settlements: [settlement]
      });
    });

  return Array.from(groups.values()).sort((left, right) => right.dateKey.localeCompare(left.dateKey));
}
