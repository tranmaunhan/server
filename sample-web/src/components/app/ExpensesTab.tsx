import type { Expense, User } from "../../types";
import { ExpenseItem } from "./ExpenseItem";

interface ExpensesTabProps {
  currentUser: User;
  expenses: Expense[];
  onCreate: () => void;
  onDelete: (expenseId: number) => void;
  onEdit: (expense: Expense) => void;
}

export function ExpensesTab({
  currentUser,
  expenses,
  onCreate,
  onDelete,
  onEdit
}: ExpensesTabProps) {
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

        <div className="list-stack">
          {expenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              canManage={expense.createdById === currentUser.id}
              expense={expense}
              onDelete={() => onDelete(expense.id)}
              onEdit={() => onEdit(expense)}
            />
          ))}
          {!expenses.length && <p className="muted-text">Chưa có dữ liệu khoản chi.</p>}
        </div>
      </section>
    </div>
  );
}
