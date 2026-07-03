import type { Expense, User } from "../../types";
import { ExpenseItem } from "./ExpenseItem";

interface ExpensesTabProps {
  currentPage: number;
  currentUser: User;
  expenses: Expense[];
  onCreate: () => void;
  onDelete: (expenseId: number) => void;
  onEdit: (expense: Expense) => void;
  onPageChange: (page: number) => void;
  totalItems: number;
  totalPages: number;
}

export function ExpensesTab({
  currentPage,
  currentUser,
  expenses,
  onCreate,
  onDelete,
  onEdit,
  onPageChange,
  totalItems,
  totalPages
}: ExpensesTabProps) {
  const hasPagination = totalPages > 1;

  return (
    <div className="tab-stack">
      <section className="panel-card compact-panel">
        <div className="panel-heading compact-heading">
          <div>
            <p className="eyebrow">Khoản chi</p>
            <h3>Danh sách gần nhất</h3>
          </div>
          <button className="secondary-button" onClick={onCreate} type="button">
            Thêm mới
          </button>
        </div>

        <div className="expense-list-summary">
          <span>Tổng cộng {totalItems} khoản chi</span>
          <span>Mỗi trang 10 khoản</span>
        </div>

        <div className="list-stack">
          {expenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              canManage={expense.createdById === currentUser.id && expense.status === "ACTIVE"}
              expense={expense}
              onDelete={() => onDelete(expense.id)}
              onEdit={() => onEdit(expense)}
            />
          ))}
          {!expenses.length && <p className="muted-text">Chưa có dữ liệu khoản chi.</p>}
        </div>

        {hasPagination && (
          <div className="pagination-bar">
            <button
              className="secondary-button"
              disabled={currentPage <= 0}
              onClick={() => onPageChange(currentPage - 1)}
              type="button"
            >
              Trang trước
            </button>
            <span>
              Trang {currentPage + 1} / {totalPages}
            </span>
            <button
              className="secondary-button"
              disabled={currentPage + 1 >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              type="button"
            >
              Trang sau
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
