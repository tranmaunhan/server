import { useEffect, useRef, useState } from "react";
import { ApiClient } from "./lib/api";
import { getAppConfig } from "./lib/config";
import { clearToken, clearUser, getToken, getUser, saveToken, saveUser } from "./lib/storage";
import type {
  DashboardResponse,
  Expense,
  ExpensePayload,
  ExpenseShareInput,
  ExpenseSplitType,
  MonthlyReport,
  Settlement,
  SettlementStatus,
  User,
  UserOption,
  UserRole
} from "./types";

type TabKey = "home" | "expenses" | "reports" | "account";

const GOOGLE_SCRIPT_ID = "google-identity-services";
const config = getAppConfig();
const api = new ApiClient(config.apiBaseUrl, () => getToken());

export default function App() {
  const today = new Date();
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [user, setUser] = useState<User | null>(() => parseStoredUser());
  const [users, setUsers] = useState<UserOption[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const buttonRenderedRef = useRef(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!config.googleClientId) {
      return;
    }

    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (!cancelled) {
          setGoogleReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Khong tai duoc thu vien dang nhap Google.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!googleReady || user || !googleButtonRef.current || buttonRenderedRef.current || !window.google?.accounts?.id) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: async (response: { credential?: string }) => {
        if (!response.credential) {
          setError("Google khong tra ve token dang nhap.");
          return;
        }
        await handleGoogleLogin(response.credential);
      }
    });

    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "filled_blue",
      size: "large",
      type: "standard",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "left",
      width: 320,
      locale: "vi"
    });
    buttonRenderedRef.current = true;
  }, [googleReady, user]);

  async function bootstrap(nextYear = year, nextMonth = month) {
    setLoading(true);
    setError("");

    try {
      const [me, memberList, dashboardData, expenseList, reportData, settlementList] = await Promise.all([
        api.getMe(),
        api.getUsers(),
        api.getDashboard(),
        api.getExpenses(),
        api.getMonthlyReport(nextYear, nextMonth),
        api.getSettlements(nextYear, nextMonth)
      ]);

      setUser(me);
      setUsers(memberList);
      setDashboard(dashboardData);
      setExpenses(expenseList);
      setReport(reportData);
      setSettlements(settlementList);
      saveUser(JSON.stringify(me));
    } catch (bootstrapError) {
      handleApiError(bootstrapError);
      logout();
    } finally {
      setLoading(false);
    }
  }

  async function refreshPeriodData(nextYear: number, nextMonth: number) {
    setLoading(true);
    setError("");
    try {
      const [reportData, settlementList] = await Promise.all([
        api.getMonthlyReport(nextYear, nextMonth),
        api.getSettlements(nextYear, nextMonth)
      ]);
      setReport(reportData);
      setSettlements(settlementList);
      setYear(nextYear);
      setMonth(nextMonth);
    } catch (periodError) {
      handleApiError(periodError);
    } finally {
      setLoading(false);
    }
  }

  async function refreshOverview() {
    try {
      const [memberList, dashboardData, expenseList] = await Promise.all([
        api.getUsers(),
        api.getDashboard(),
        api.getExpenses()
      ]);
      setUsers(memberList);
      setDashboard(dashboardData);
      setExpenses(expenseList);
    } catch (overviewError) {
      handleApiError(overviewError);
    }
  }

  async function handleGoogleLogin(credential: string) {
    setAuthenticating(true);
    setError("");
    setMessage("Dang xac thuc tai khoan Google...");

    try {
      const response = await api.loginWithGoogle(credential);
      saveToken(response.accessToken);
      saveUser(JSON.stringify(response.user));
      setUser(response.user);
      setMessage("Dang nhap thanh cong.");
      await bootstrap();
    } catch (loginError) {
      handleApiError(loginError);
    } finally {
      setAuthenticating(false);
    }
  }

  async function handleSaveExpense(payload: ExpensePayload) {
    try {
      if (editingExpense) {
        await api.updateExpense(editingExpense.id, payload);
        setMessage("Da cap nhat khoan chi.");
      } else {
        await api.createExpense(payload);
        setMessage("Da them khoan chi moi.");
      }

      setShowExpenseForm(false);
      setEditingExpense(null);
      await refreshOverview();
      await refreshPeriodData(year, month);
    } catch (saveError) {
      handleApiError(saveError);
    }
  }

  async function handleDeleteExpense(expenseId: number) {
    try {
      await api.deleteExpense(expenseId);
      setMessage("Da huy khoan chi.");
      await refreshOverview();
      await refreshPeriodData(year, month);
    } catch (deleteError) {
      handleApiError(deleteError);
    }
  }

  async function handleUserRoleChange(userId: number, role: UserRole) {
    try {
      await api.updateUserRole(userId, role);
      setMessage("Da cap nhat quyen thanh vien.");
      await refreshOverview();
    } catch (roleError) {
      handleApiError(roleError);
    }
  }

  async function handleUserStatusChange(userId: number, active: boolean) {
    try {
      await api.updateUserStatus(userId, active);
      setMessage(active ? "Da mo khoa thanh vien." : "Da khoa thanh vien.");
      await refreshOverview();
    } catch (statusError) {
      handleApiError(statusError);
    }
  }

  async function handleGenerateSettlements() {
    try {
      await api.generateSettlements(year, month);
      setMessage("Da tao danh sach quyet toan thang.");
      await refreshPeriodData(year, month);
    } catch (generateError) {
      handleApiError(generateError);
    }
  }

  async function handleSettlementStatus(settlementId: number, status: SettlementStatus) {
    try {
      await api.updateSettlementStatus(settlementId, status);
      setMessage(status === "PAID" ? "Da danh dau da thanh toan." : "Da chuyen ve trang thai cho thanh toan.");
      await refreshPeriodData(year, month);
    } catch (settlementError) {
      handleApiError(settlementError);
    }
  }

  function openCreateExpense() {
    setEditingExpense(null);
    setShowExpenseForm(true);
  }

  function openEditExpense(expense: Expense) {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  }

  function logout() {
    clearToken();
    clearUser();
    setUser(null);
    setUsers([]);
    setDashboard(null);
    setExpenses([]);
    setReport(null);
    setSettlements([]);
    buttonRenderedRef.current = false;
  }

  function handleApiError(errorValue: unknown) {
    const nextMessage = errorValue instanceof Error ? errorValue.message : "Da co loi xay ra.";
    setError(nextMessage);
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand-mark">₫</div>
          <p className="eyebrow">Family Expense PWA</p>
          <h1>Quan ly chi tieu gia dinh trong mot cham</h1>
          <p className="lead">
            Dang nhap bang Google, backend se tao JWT rieng cho he thong va frontend su dung Bearer Token cho toan bo API.
          </p>
          {config.googleClientId ? (
            <div className="google-login-box" ref={googleButtonRef} />
          ) : (
            <p className="warning-text">Chua cau hinh VITE_GOOGLE_CLIENT_ID.</p>
          )}
          {authenticating && <p className="helper-text">Dang xac thuc...</p>}
          {message && <p className="helper-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Family Expense PWA</p>
          <h1>{tabTitle(activeTab)}</h1>
        </div>
        <button className="topbar-avatar" onClick={() => setActiveTab("account")} type="button">
          <img alt={user.fullName} src={user.avatarUrl || fallbackAvatar(user.fullName)} />
        </button>
      </header>

      {loading && <div className="status-banner">Dang tai du lieu...</div>}
      {message && <div className="status-banner success">{message}</div>}
      {error && <div className="status-banner error">{error}</div>}

      <section className="screen-content">
        {activeTab === "home" && (
          <HomeTab
            user={user}
            dashboard={dashboard}
            onAddExpense={openCreateExpense}
          />
        )}

        {activeTab === "expenses" && (
          <ExpensesTab
            expenses={expenses}
            onCreate={openCreateExpense}
            onEdit={openEditExpense}
            onDelete={handleDeleteExpense}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab
            report={report}
            settlements={settlements}
            month={month}
            year={year}
            onPeriodChange={refreshPeriodData}
            onGenerateSettlements={handleGenerateSettlements}
            onSettlementStatus={handleSettlementStatus}
          />
        )}

        {activeTab === "account" && (
          <AccountTab
            currentUser={user}
            users={users}
            onLogout={logout}
            onUserRoleChange={handleUserRoleChange}
            onUserStatusChange={handleUserStatusChange}
          />
        )}
      </section>

      <button className="fab-button" onClick={openCreateExpense} type="button" aria-label="Them khoan chi">
        +
      </button>

      <nav className="bottom-nav">
        {[
          { key: "home", label: "Trang chu" },
          { key: "expenses", label: "Khoan chi" },
          { key: "reports", label: "Bao cao" },
          { key: "account", label: "Tai khoan" }
        ].map((item) => (
          <button
            key={item.key}
            className={activeTab === item.key ? "bottom-nav-item active" : "bottom-nav-item"}
            onClick={() => setActiveTab(item.key as TabKey)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {showExpenseForm && (
        <ExpenseFormSheet
          users={users.filter((member) => member.active)}
          initialExpense={editingExpense}
          onClose={() => {
            setShowExpenseForm(false);
            setEditingExpense(null);
          }}
          onSave={handleSaveExpense}
        />
      )}
    </main>
  );
}

function HomeTab({
  user,
  dashboard,
  onAddExpense
}: {
  user: User;
  dashboard: DashboardResponse | null;
  onAddExpense: () => void;
}) {
  return (
    <div className="tab-stack">
      <section className="hero-card">
        <div className="hero-row">
          <div>
            <p className="hero-subtitle">Xin chao, {user.fullName}</p>
            <h2>Them khoan chi trong duoi 20 giay</h2>
            <p>
              Chon nguoi thanh toan, chon kieu chia, backend se tu tinh so tien tung thanh vien phai chiu.
            </p>
          </div>
          <img className="hero-avatar" alt={user.fullName} src={user.avatarUrl || fallbackAvatar(user.fullName)} />
        </div>
        <button className="primary-button" onClick={onAddExpense} type="button">
          Them khoan chi moi
        </button>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Tong chi thang nay" value={formatCurrency(dashboard?.monthTotal || 0)} />
        <MetricCard label="Chi hom nay" value={formatCurrency(dashboard?.todayTotal || 0)} />
        <MetricCard label="So khoan chi thang nay" value={String(dashboard?.monthExpenseCount || 0)} />
        <MetricCard
          label="Nguoi thanh toan nhieu nhat"
          value={dashboard?.topPayerName ? `${dashboard.topPayerName} · ${formatCurrency(dashboard.topPayerAmount)}` : "Chua co"}
        />
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Gan day</p>
            <h3>Khoan chi moi nhat</h3>
          </div>
        </div>
        <div className="list-stack">
          {(dashboard?.recentExpenses || []).map((expense) => (
            <ExpenseItem key={expense.id} expense={expense} compact />
          ))}
          {!dashboard?.recentExpenses?.length && <p className="muted-text">Chua co khoan chi nao trong thang nay.</p>}
        </div>
      </section>
    </div>
  );
}

function ExpensesTab({
  expenses,
  onCreate,
  onEdit,
  onDelete
}: {
  expenses: Expense[];
  onCreate: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: number) => void;
}) {
  return (
    <div className="tab-stack">
      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Timeline</p>
            <h3>Danh sach khoan chi</h3>
          </div>
          <button className="secondary-button" onClick={onCreate} type="button">
            Them moi
          </button>
        </div>

        <div className="list-stack">
          {expenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              onEdit={() => onEdit(expense)}
              onDelete={() => onDelete(expense.id)}
            />
          ))}
          {!expenses.length && <p className="muted-text">Chua co du lieu khoan chi.</p>}
        </div>
      </section>
    </div>
  );
}

function ReportsTab({
  report,
  settlements,
  month,
  year,
  onPeriodChange,
  onGenerateSettlements,
  onSettlementStatus
}: {
  report: MonthlyReport | null;
  settlements: Settlement[];
  month: number;
  year: number;
  onPeriodChange: (year: number, month: number) => void;
  onGenerateSettlements: () => void;
  onSettlementStatus: (settlementId: number, status: SettlementStatus) => void;
}) {
  return (
    <div className="tab-stack">
      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Bao cao thang</p>
            <h3>Tong hop thanh toan va phan bo chi phi</h3>
          </div>
          <div className="period-controls">
            <select value={month} onChange={(event) => onPeriodChange(year, Number(event.target.value))}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                <option key={item} value={item}>
                  Thang {item}
                </option>
              ))}
            </select>
            <input type="number" value={year} onChange={(event) => onPeriodChange(Number(event.target.value), month)} />
          </div>
        </div>

        <div className="metrics-grid">
          <MetricCard label="Tong da chi" value={formatCurrency(report?.totalExpenseAmount || 0)} />
          <MetricCard label="Tong so khoan chi" value={String(report?.totalExpenseCount || 0)} />
        </div>

        <div className="list-stack">
          {report?.members.map((member) => (
            <article className="member-balance-card" key={member.userId}>
              <div>
                <strong>{member.fullName}</strong>
                <p>Da thanh toan: {formatCurrency(member.paidAmount)}</p>
                <p>Phai chiu: {formatCurrency(member.shareAmount)}</p>
              </div>
              <span className={member.balance >= 0 ? "balance-pill positive" : "balance-pill negative"}>
                {member.balance >= 0 ? "+" : ""}
                {formatCurrency(member.balance)}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Goi y chuyen tien</p>
            <h3>Ket qua quyet toan cuoi thang</h3>
          </div>
          <button className="secondary-button" onClick={onGenerateSettlements} type="button">
            Tao quyet toan
          </button>
        </div>

        <div className="list-stack">
          {report?.suggestions.map((item, index) => (
            <article className="settlement-suggestion-card" key={`${item.fromUserId}-${item.toUserId}-${index}`}>
              <strong>{item.fromUserName}</strong>
              <span>chuyen</span>
              <strong>{formatCurrency(item.amount)}</strong>
              <span>cho</span>
              <strong>{item.toUserName}</strong>
            </article>
          ))}
          {!report?.suggestions?.length && <p className="muted-text">Thang nay chua can tao quyet toan.</p>}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Danh sach quyet toan</p>
            <h3>Theo doi trang thai thanh toan</h3>
          </div>
        </div>

        <div className="list-stack">
          {settlements.map((settlement) => (
            <article className="settlement-card" key={settlement.id}>
              <div>
                <strong>
                  {settlement.fromUserName} → {settlement.toUserName}
                </strong>
                <p>{formatCurrency(settlement.amount)}</p>
              </div>
              <button
                className={settlement.status === "PAID" ? "secondary-button paid" : "secondary-button"}
                onClick={() =>
                  onSettlementStatus(settlement.id, settlement.status === "PAID" ? "PENDING" : "PAID")
                }
                type="button"
              >
                {settlement.status === "PAID" ? "Da thanh toan" : "Cho thanh toan"}
              </button>
            </article>
          ))}
          {!settlements.length && <p className="muted-text">Chua co ban ghi quyet toan nao.</p>}
        </div>
      </section>
    </div>
  );
}

function AccountTab({
  currentUser,
  users,
  onLogout,
  onUserRoleChange,
  onUserStatusChange
}: {
  currentUser: User;
  users: UserOption[];
  onLogout: () => void;
  onUserRoleChange: (userId: number, role: UserRole) => void;
  onUserStatusChange: (userId: number, active: boolean) => void;
}) {
  return (
    <div className="tab-stack">
      <section className="panel-card">
        <div className="account-header">
          <img alt={currentUser.fullName} src={currentUser.avatarUrl || fallbackAvatar(currentUser.fullName)} />
          <div>
            <h3>{currentUser.fullName}</h3>
            <p>{currentUser.email}</p>
            <span className="role-pill">{currentUser.role}</span>
          </div>
        </div>
        <button className="secondary-button danger" onClick={onLogout} type="button">
          Dang xuat
        </button>
      </section>

      {currentUser.role === "ADMIN" && (
        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Quan ly thanh vien</p>
              <h3>Admin panel</h3>
            </div>
          </div>
          <div className="list-stack">
            {users.map((member) => (
              <article className="member-admin-card" key={member.id}>
                <div>
                  <strong>{member.fullName}</strong>
                  <p>{member.email}</p>
                </div>
                <div className="member-actions">
                  <select
                    value={member.role}
                    onChange={(event) => onUserRoleChange(member.id, event.target.value as UserRole)}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                  <button
                    className={member.active ? "secondary-button" : "secondary-button danger"}
                    onClick={() => onUserStatusChange(member.id, !member.active)}
                    type="button"
                  >
                    {member.active ? "Khoa" : "Mo khoa"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ExpenseFormSheet({
  users,
  initialExpense,
  onClose,
  onSave
}: {
  users: UserOption[];
  initialExpense: Expense | null;
  onClose: () => void;
  onSave: (payload: ExpensePayload) => Promise<void>;
}) {
  const activeUsers = users.filter((user) => user.active);
  const initialSelectedIds = initialExpense
    ? initialExpense.shares.map((share) => share.userId)
    : activeUsers.slice(0, Math.min(activeUsers.length, 3)).map((user) => user.id);

  const [amount, setAmount] = useState<string>(initialExpense ? String(initialExpense.amount) : "");
  const [description, setDescription] = useState<string>(initialExpense?.description || "");
  const [imageUrl, setImageUrl] = useState<string>(initialExpense?.imageUrl || "");
  const [expenseDate, setExpenseDate] = useState<string>(initialExpense?.expenseDate || formatDateInput(new Date()));
  const [payerId, setPayerId] = useState<number>(initialExpense?.payerId || activeUsers[0]?.id || 0);
  const [splitType, setSplitType] = useState<ExpenseSplitType>(initialExpense?.splitType || "EQUAL");
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [manualShares, setManualShares] = useState<Record<number, string>>(() => {
    const values: Record<number, string> = {};
    if (initialExpense) {
      initialExpense.shares.forEach((share) => {
        values[share.userId] = String(share.shareAmount);
      });
    }
    return values;
  });
  const [formError, setFormError] = useState("");

  const numericAmount = Number(amount || 0);
  const equalPreview = calculateEqualSplit(numericAmount, selectedIds.length);
  const manualTotal = selectedIds.reduce((sum, userId) => sum + Number(manualShares[userId] || 0), 0);

  function toggleUser(userId: number) {
    setSelectedIds((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }
      return [...current, userId];
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!numericAmount || numericAmount <= 0) {
      setFormError("Tong tien phai lon hon 0.");
      return;
    }

    if (!selectedIds.length) {
      setFormError("Hay chon it nhat mot nguoi chiu tien.");
      return;
    }

    let shares: ExpenseShareInput[] = [];
    if (splitType === "EQUAL") {
      shares = selectedIds.map((userId, index) => ({
        userId,
        shareAmount: equalPreview[index]
      }));
    } else {
      shares = selectedIds.map((userId) => ({
        userId,
        shareAmount: Number(manualShares[userId] || 0)
      }));

      const roundedAmount = roundMoney(numericAmount);
      const roundedShared = roundMoney(manualTotal);
      if (roundedAmount !== roundedShared) {
        setFormError("Tong so tien da chia phai bang tong hoa don.");
        return;
      }
    }

    await onSave({
      payerId,
      amount: roundMoney(numericAmount),
      description,
      imageUrl,
      expenseDate,
      splitType,
      shares
    });
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{initialExpense ? "Chinh sua" : "Them moi"}</p>
            <h3>{initialExpense ? "Cap nhat khoan chi" : "Them khoan chi"}</h3>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <form className="sheet-form" onSubmit={handleSubmit}>
          <label>
            Tong tien
            <input type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>

          <label>
            Mo ta
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>

          <label>
            Anh hoa don (URL)
            <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
          </label>

          <label>
            Ngay chi
            <input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
          </label>

          <label>
            Nguoi thanh toan
            <select value={payerId} onChange={(event) => setPayerId(Number(event.target.value))}>
              {activeUsers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </label>

          <div className="split-toggle">
            <button
              className={splitType === "EQUAL" ? "toggle-button active" : "toggle-button"}
              onClick={() => setSplitType("EQUAL")}
              type="button"
            >
              Chia deu
            </button>
            <button
              className={splitType === "AMOUNT" ? "toggle-button active" : "toggle-button"}
              onClick={() => setSplitType("AMOUNT")}
              type="button"
            >
              Chia theo so tien
            </button>
          </div>

          <div className="member-selector">
            {activeUsers.map((member) => (
              <button
                key={member.id}
                className={selectedIds.includes(member.id) ? "member-chip active" : "member-chip"}
                onClick={() => toggleUser(member.id)}
                type="button"
              >
                {member.fullName}
              </button>
            ))}
          </div>

          {splitType === "AMOUNT" ? (
            <div className="share-grid">
              {selectedIds.map((userId) => {
                const member = activeUsers.find((item) => item.id === userId);
                if (!member) return null;
                return (
                  <label key={userId}>
                    {member.fullName}
                    <input
                      type="number"
                      step="0.01"
                      value={manualShares[userId] || ""}
                      onChange={(event) =>
                        setManualShares((current) => ({
                          ...current,
                          [userId]: event.target.value
                        }))
                      }
                    />
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="preview-grid">
              {selectedIds.map((userId, index) => {
                const member = activeUsers.find((item) => item.id === userId);
                if (!member) return null;
                return (
                  <div className="preview-row" key={userId}>
                    <span>{member.fullName}</span>
                    <strong>{formatCurrency(equalPreview[index] || 0)}</strong>
                  </div>
                );
              })}
            </div>
          )}

          <div className="summary-strip">
            <div>
              <span>Tong hoa don</span>
              <strong>{formatCurrency(numericAmount)}</strong>
            </div>
            <div>
              <span>Tong da chia</span>
              <strong>{formatCurrency(splitType === "EQUAL" ? equalPreview.reduce((sum, item) => sum + item, 0) : manualTotal)}</strong>
            </div>
          </div>

          {formError && <p className="error-text">{formError}</p>}

          <div className="sheet-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Dong
            </button>
            <button className="primary-button" type="submit">
              {initialExpense ? "Luu thay doi" : "Luu khoan chi"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ExpenseItem({
  expense,
  compact,
  onEdit,
  onDelete
}: {
  expense: Expense;
  compact?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="expense-card">
      <div className="expense-main">
        <div>
          <strong>{expense.description}</strong>
          <p>
            {expense.payerName} thanh toan · {formatDate(expense.expenseDate)}
          </p>
          <p>{expense.shares.map((share) => `${share.fullName}: ${formatCurrency(share.shareAmount)}`).join(" · ")}</p>
        </div>
        <strong className="expense-amount">{formatCurrency(expense.amount)}</strong>
      </div>
      {!compact && (
        <div className="expense-actions">
          <button className="secondary-button" onClick={onEdit} type="button">
            Sua
          </button>
          <button className="secondary-button danger" onClick={onDelete} type="button">
            Xoa
          </button>
        </div>
      )}
    </article>
  );
}

function parseStoredUser(): User | null {
  const raw = getUser();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    clearUser();
    return null;
  }
}

function loadGoogleScript() {
  return new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Khong tai duoc Google script"));
    document.head.appendChild(script);
  });
}

function fallbackAvatar(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="48" fill="#d8efe7" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#0f4d43">
        ${initials || "U"}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function tabTitle(tab: TabKey) {
  switch (tab) {
    case "home":
      return "Trang chu";
    case "expenses":
      return "Khoan chi";
    case "reports":
      return "Bao cao";
    case "account":
      return "Tai khoan";
    default:
      return "Family Expense";
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateEqualSplit(total: number, count: number) {
  if (!total || !count) {
    return [];
  }
  const base = Math.floor((total * 100) / count) / 100;
  const shares = Array.from({ length: count }, () => base);
  const assigned = roundMoney(base * count);
  let remainderCents = Math.round((roundMoney(total) - assigned) * 100);
  let index = 0;
  while (remainderCents > 0) {
    shares[index] = roundMoney(shares[index] + 0.01);
    remainderCents -= 1;
    index = (index + 1) % count;
  }
  return shares;
}
