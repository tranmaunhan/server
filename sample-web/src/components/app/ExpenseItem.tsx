import { formatCurrency, formatDate } from "../../lib/ui";
import type { Expense } from "../../types";

interface ExpenseItemProps {
  canManage?: boolean;
  compact?: boolean;
  expense: Expense;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function ExpenseItem({
  canManage,
  compact,
  expense,
  onDelete,
  onEdit
}: ExpenseItemProps) {
  return (
    <article className="expense-card">
      <div className="expense-main">
        <div>
          <strong>{expense.description}</strong>
          <p>
            {expense.payerName} thanh toán · {formatDate(expense.expenseDate)}
          </p>
          <p>{expense.shares.map((share) => `${share.fullName}: ${formatCurrency(share.shareAmount)}`).join(" · ")}</p>
          {expense.imageUrl && (
            <>
              <img
                alt="Ảnh hóa đơn"
                className="expense-receipt-image"
                decoding="async"
                loading="lazy"
                src={expense.imageUrl}
              />
            
            </>
          )}
        </div>
        <strong className="expense-amount">{formatCurrency(expense.amount)}</strong>
      </div>
      {!compact && canManage && (
        <div className="expense-actions">
          <button className="secondary-button" onClick={onEdit} type="button">
            Sửa
          </button>
          <button className="secondary-button danger" onClick={onDelete} type="button">
            Xóa
          </button>
        </div>
      )}
    </article>
  );
}
