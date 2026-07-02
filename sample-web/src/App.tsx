import { useEffect, useRef, useState } from "react";
import { ApiClient } from "./lib/api";
import { getAppConfig } from "./lib/config";
import { compressImageForUpload } from "./lib/image";
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
const PULL_REFRESH_THRESHOLD = 84;
const PULL_REFRESH_MAX = 132;
const PULL_REFRESH_HOLD = 68;
const config = getAppConfig();
const api = new ApiClient(config.apiBaseUrl, () => getToken());

export default function App() {
  const today = new Date();
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [user, setUser] = useState<User | null>(() => parseStoredUser());
  const [users, setUsers] = useState<UserOption[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserOption[]>([]);
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
  const [pullDistance, setPullDistance] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const buttonRenderedRef = useRef(false);
  const pullStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const pullActiveRef = useRef(false);

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
      console.warn("[auth] missing Google client id in runtime config", {
        origin: window.location.origin,
        apiBaseUrl: config.apiBaseUrl
      });
      return;
    }

    console.info("[auth] runtime config loaded", {
      origin: window.location.origin,
      apiBaseUrl: config.apiBaseUrl,
      googleClientIdPreview: maskValue(config.googleClientId)
    });

    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (!cancelled) {
          setGoogleReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không tải được thư viện đăng nhập Google.");
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
          setError("Google không trả về token đăng nhập.");
          return;
        }
        console.info("[auth] received Google credential", summarizeGoogleCredential(response.credential));
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

  function updatePullDistance(nextDistance: number) {
    pullDistanceRef.current = nextDistance;
    setPullDistance(nextDistance);
  }

  function resetPullState() {
    pullStartYRef.current = null;
    pullActiveRef.current = false;
    updatePullDistance(0);
  }

  function canStartPullRefresh() {
    return !showExpenseForm && !loading && !authenticating && !pullRefreshing && window.scrollY <= 0;
  }

  async function loadAdminUsers(nextUser: User | null) {
    if (nextUser?.role !== "ADMIN") {
      return [];
    }

    return api.getAdminUsers();
  }

  async function syncAppData(nextYear = year, nextMonth = month) {
    setError("");
    const [me, memberList, dashboardData, expenseList, reportData, settlementList] = await Promise.all([
      api.getMe(),
      api.getUsers(),
      api.getDashboard(),
      api.getExpenses(),
      api.getMonthlyReport(nextYear, nextMonth),
      api.getSettlements(nextYear, nextMonth)
    ]);
    const nextAdminUsers = await loadAdminUsers(me);

    setUser(me);
    setUsers(memberList);
    setAdminUsers(nextAdminUsers);
    setDashboard(dashboardData);
    setExpenses(expenseList);
    setReport(reportData);
    setSettlements(settlementList);
    saveUser(JSON.stringify(me));
  }

  async function bootstrap(nextYear = year, nextMonth = month) {
    setLoading(true);

    try {
      await syncAppData(nextYear, nextMonth);
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
      const adminUsersPromise = loadAdminUsers(user);
      const [memberList, dashboardData, expenseList] = await Promise.all([
        api.getUsers(),
        api.getDashboard(),
        api.getExpenses()
      ]);
      const nextAdminUsers = await adminUsersPromise;
      setUsers(memberList);
      setAdminUsers(nextAdminUsers);
      setDashboard(dashboardData);
      setExpenses(expenseList);
    } catch (overviewError) {
      handleApiError(overviewError);
    }
  }

  async function handlePullRefresh() {
    if (pullRefreshing) {
      return;
    }

    setPullRefreshing(true);
    updatePullDistance(PULL_REFRESH_HOLD);

    try {
      await syncAppData(year, month);
      setMessage("\u0110\u00e3 l\u00e0m m\u1edbi d\u1eef li\u1ec7u.");
    } catch (refreshError) {
      handleApiError(refreshError);
    } finally {
      setPullRefreshing(false);
      resetPullState();
    }
  }

  function handleAppTouchStart(event: React.TouchEvent<HTMLElement>) {
    if (!canStartPullRefresh()) {
      resetPullState();
      return;
    }

    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    pullActiveRef.current = false;
  }

  function handleAppTouchMove(event: React.TouchEvent<HTMLElement>) {
    if (pullStartYRef.current == null || showExpenseForm || pullRefreshing) {
      return;
    }

    const currentY = event.touches[0]?.clientY;
    if (currentY == null) {
      return;
    }

    const deltaY = currentY - pullStartYRef.current;
    if (deltaY <= 0) {
      if (pullActiveRef.current) {
        resetPullState();
      }
      return;
    }

    if (window.scrollY > 0 && !pullActiveRef.current) {
      pullStartYRef.current = null;
      return;
    }

    pullActiveRef.current = true;
    const nextDistance = Math.min(PULL_REFRESH_MAX, deltaY * 0.45);
    updatePullDistance(nextDistance);

    if (event.cancelable) {
      event.preventDefault();
    }
  }

  function handleAppTouchEnd() {
    const shouldRefresh = pullActiveRef.current && pullDistanceRef.current >= PULL_REFRESH_THRESHOLD;

    pullStartYRef.current = null;
    pullActiveRef.current = false;

    if (shouldRefresh) {
      void handlePullRefresh();
      return;
    }

    updatePullDistance(0);
  }

  async function handleGoogleLogin(credential: string) {
    setAuthenticating(true);
    setError("");
    setMessage("Đang xác thực tài khoản Google...");

    try {
      console.info("[auth] sending Google credential to backend", {
        apiBaseUrl: config.apiBaseUrl,
        loginUrl: `${config.apiBaseUrl}/auth/google`,
        credential: summarizeGoogleCredential(credential)
      });
      const response = await api.loginWithGoogle(credential);
      saveToken(response.accessToken);
      saveUser(JSON.stringify(response.user));
      setUser(response.user);
      setMessage("Đăng nhập thành công.");
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
        setMessage("Đã cập nhật khoản chi.");
      } else {
        await api.createExpense(payload);
        setMessage("Đã thêm khoản chi mới.");
      }

      setShowExpenseForm(false);
      setEditingExpense(null);
      await refreshOverview();
      await refreshPeriodData(year, month);
    } catch (saveError) {
      handleApiError(saveError);
    }
  }

  async function handleUploadExpenseImage(file: File) {
    const uploadFile = await compressImageForUpload(file);
    console.info("[expense] upload receipt image", {
      originalName: file.name,
      originalSize: file.size,
      uploadName: uploadFile.name,
      uploadSize: uploadFile.size,
      type: uploadFile.type
    });
    const response = await api.uploadExpenseImage(uploadFile);
    setMessage("Đã tải ảnh hóa đơn lên server.");
    return response.url;
  }

  async function handleDeleteExpense(expenseId: number) {
    try {
      await api.deleteExpense(expenseId);
      setMessage("Đã xóa khoản chi.");
      await refreshOverview();
      await refreshPeriodData(year, month);
    } catch (deleteError) {
      handleApiError(deleteError);
    }
  }

  async function handleUserRoleChange(userId: number, role: UserRole) {
    try {
      await api.updateUserRole(userId, role);
      setMessage("Đã cập nhật quyền thành viên.");
      await refreshOverview();
    } catch (roleError) {
      handleApiError(roleError);
    }
  }

  async function handleUserStatusChange(userId: number, active: boolean) {
    try {
      await api.updateUserStatus(userId, active);
      setMessage(active ? "Đã mở khóa thành viên." : "Đã khóa thành viên.");
      await refreshOverview();
    } catch (statusError) {
      handleApiError(statusError);
    }
  }

  async function handleGenerateSettlements() {
    try {
      await api.generateSettlements(year, month);
      setMessage("Đã tạo danh sách quyết toán tháng.");
      await refreshPeriodData(year, month);
    } catch (generateError) {
      handleApiError(generateError);
    }
  }

  async function handleSettlementStatus(settlementId: number, status: SettlementStatus) {
    try {
      await api.updateSettlementStatus(settlementId, status);
      setMessage(status === "PAID" ? "Đã đánh dấu đã thanh toán." : "Đã chuyển về trạng thái chờ thanh toán.");
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
    setAdminUsers([]);
    setDashboard(null);
    setExpenses([]);
    setReport(null);
    setSettlements([]);
    buttonRenderedRef.current = false;
  }

  function handleApiError(errorValue: unknown) {
    console.error("[app] api error", errorValue);
    const nextMessage = errorValue instanceof Error ? errorValue.message : "Đã có lỗi xảy ra.";
    setError(nextMessage);
  }

  const pullProgress = Math.min(pullDistance / PULL_REFRESH_THRESHOLD, 1);
  const pullOffset = pullDistance > 0 || pullRefreshing ? Math.max(pullDistance, pullRefreshing ? PULL_REFRESH_HOLD : 0) : 0;
  const pullLabel = pullRefreshing
    ? "\u0110ang l\u00e0m m\u1edbi d\u1eef li\u1ec7u..."
    : pullDistance >= PULL_REFRESH_THRESHOLD
      ? "Th\u1ea3 tay \u0111\u1ec3 l\u00e0m m\u1edbi"
      : "K\u00e9o xu\u1ed1ng \u0111\u1ec3 l\u00e0m m\u1edbi";

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand-mark">₫</div>
          <p className="eyebrow">Family Expense PWA</p>
          <h1>Quản lý chi tiêu gia đình trong một chạm</h1>
          <p className="lead">
            Đăng nhập bằng Google, backend sẽ tạo JWT riêng cho hệ thống và frontend sử dụng Bearer Token cho toàn bộ API.
          </p>
          {config.googleClientId ? (
            <div className="google-login-box" ref={googleButtonRef} />
          ) : (
            <p className="warning-text">Chưa cấu hình `VITE_GOOGLE_CLIENT_ID`.</p>
          )}
          {authenticating && <p className="helper-text">Đang xác thực...</p>}
          {message && <p className="helper-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main
      className={pullOffset > 0 ? "app-shell pull-active" : "app-shell"}
      onTouchCancel={handleAppTouchEnd}
      onTouchEnd={handleAppTouchEnd}
      onTouchMove={handleAppTouchMove}
      onTouchStart={handleAppTouchStart}
    >
      <div
        className={pullOffset > 0 || pullRefreshing ? "pull-refresh-indicator visible" : "pull-refresh-indicator"}
        style={{
          opacity: pullRefreshing ? 1 : pullProgress,
          transform: `translate(-50%, ${Math.max(8, pullOffset - 30)}px)`
        }}
      >
        <span className={pullRefreshing ? "pull-refresh-spinner spinning" : "pull-refresh-spinner"} />
        <strong>{pullLabel}</strong>
      </div>

      <div className="pull-refresh-shell" style={{ transform: `translateY(${pullOffset}px)` }}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Family Expense PWA</p>
          <h1>{tabTitle(activeTab)}</h1>
        </div>
        <button className="topbar-avatar" onClick={() => setActiveTab("account")} type="button">
          <img alt={user.fullName} src={user.avatarUrl || fallbackAvatar(user.fullName)} />
        </button>
      </header>

      {loading && <div className="status-banner">Đang tải dữ liệu...</div>}
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
            currentUser={user}
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
            users={adminUsers}
            onLogout={logout}
            onUserRoleChange={handleUserRoleChange}
            onUserStatusChange={handleUserStatusChange}
          />
        )}
      </section>
      </div>

      <button className="fab-button" onClick={openCreateExpense} type="button" aria-label="Thêm khoản chi">
        +
      </button>

      <nav className="bottom-nav">
        {[
          { key: "home", label: "Trang chủ" },
          { key: "expenses", label: "Khoản chi" },
          { key: "reports", label: "Báo cáo" },
          { key: "account", label: "Tài khoản" }
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
          currentUser={user}
          users={users}
          initialExpense={editingExpense}
          onUploadImage={handleUploadExpenseImage}
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
            <p className="hero-subtitle">Xin chào, {user.fullName}</p>
            <h2>Thêm khoản chi trong dưới 20 giây</h2>
            <p>
              Người thanh toán được lấy từ tài khoản đăng nhập, backend sẽ tự tính số tiền từng thành viên phải chịu.
            </p>
          </div>
          <img className="hero-avatar" alt={user.fullName} src={user.avatarUrl || fallbackAvatar(user.fullName)} />
        </div>
        <button className="primary-button" onClick={onAddExpense} type="button">
          Thêm khoản chi mới
        </button>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Tổng chi tháng này" value={formatCurrency(dashboard?.monthTotal || 0)} />
        <MetricCard label="Chi hôm nay" value={formatCurrency(dashboard?.todayTotal || 0)} />
        <MetricCard label="Số khoản chi tháng này" value={String(dashboard?.monthExpenseCount || 0)} />
        <MetricCard
          label="Người thanh toán nhiều nhất"
          value={dashboard?.topPayerName ? `${dashboard.topPayerName} · ${formatCurrency(dashboard.topPayerAmount)}` : "Chưa có"}
        />
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Gần đây</p>
            <h3>Khoản chi mới nhất</h3>
          </div>
        </div>
        <div className="list-stack">
          {(dashboard?.recentExpenses || []).map((expense) => (
            <ExpenseItem key={expense.id} expense={expense} compact />
          ))}
          {!dashboard?.recentExpenses?.length && <p className="muted-text">Chưa có khoản chi nào trong tháng này.</p>}
        </div>
      </section>
    </div>
  );
}

function ExpensesTab({
  currentUser,
  expenses,
  onCreate,
  onEdit,
  onDelete
}: {
  currentUser: User;
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
            <p className="eyebrow">Dòng thời gian</p>
            <h3>Danh sách khoản chi</h3>
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
              onEdit={() => onEdit(expense)}
              onDelete={() => onDelete(expense.id)}
            />
          ))}
          {!expenses.length && <p className="muted-text">Chưa có dữ liệu khoản chi.</p>}
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
            <p className="eyebrow">Báo cáo tháng</p>
            <h3>Tổng hợp thanh toán và phân bổ chi phí</h3>
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
          <MetricCard label="Tổng số khoản chi" value={String(report?.totalExpenseCount || 0)} />
        </div>

        <div className="list-stack">
          {report?.members.map((member) => (
            <article className="member-balance-card" key={member.userId}>
              <div>
                <strong>{member.fullName}</strong>
                <p>Đã thanh toán: {formatCurrency(member.paidAmount)}</p>
                <p>Phải chịu: {formatCurrency(member.shareAmount)}</p>
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
            <p className="eyebrow">Gợi ý chuyển tiền</p>
            <h3>Kết quả quyết toán cuối tháng</h3>
          </div>
          <button className="secondary-button" onClick={onGenerateSettlements} type="button">
            Tạo quyết toán
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

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Danh sách quyết toán</p>
            <h3>Theo dõi trạng thái thanh toán</h3>
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
          Đăng xuất
        </button>
      </section>

      {currentUser.role === "ADMIN" && (
        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Quản lý thành viên</p>
              <h3>Admin panel</h3>
              <p className="muted-text">
                {"Danh s\u00e1ch n\u00e0y bao g\u1ed3m c\u1ea3 t\u00e0i kho\u1ea3n \u0111ang ho\u1ea1t \u0111\u1ed9ng v\u00e0 t\u00e0i kho\u1ea3n \u0111\u00e3 b\u1ecb kh\u00f3a."}
              </p>
            </div>
          </div>
          <div className="list-stack">
            {users.map((member) => (
              <article className="member-admin-card" key={member.id}>
                <div>
                  <strong>{member.fullName}</strong>
                  <p>{member.email}</p>
                  <p>{member.active ? "\u0110ang ho\u1ea1t \u0111\u1ed9ng" : "\u0110\u00e3 b\u1ecb kh\u00f3a"}</p>
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
                    {member.active ? "Khóa" : "Mở khóa"}
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
  currentUser,
  users,
  initialExpense,
  onUploadImage,
  onClose,
  onSave
}: {
  currentUser: User;
  users: UserOption[];
  initialExpense: Expense | null;
  onUploadImage: (file: File) => Promise<string>;
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
  const expenseDate = initialExpense?.expenseDate || formatDateInput(new Date());
  const payerId = initialExpense?.payerId || currentUser.id || activeUsers[0]?.id || 0;
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  async function handleImagePick(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    setFormError("");
    setUploadingImage(true);

    try {
      const nextImageUrl = await onUploadImage(selectedFile);
      setImageUrl(nextImageUrl);
    } catch (uploadError) {
      setFormError(uploadError instanceof Error ? uploadError.message : "Không tải được ảnh hóa đơn.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!numericAmount || numericAmount <= 0) {
      setFormError("Tổng tiền phải lớn hơn 0.");
      return;
    }

    if (!selectedIds.length) {
      setFormError("Hãy chọn ít nhất một người chịu tiền.");
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
        setFormError("Tổng số tiền đã chia phải bằng tổng hóa đơn.");
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
            <p className="eyebrow">{initialExpense ? "Chỉnh sửa" : "Thêm mới"}</p>
            <h3>{initialExpense ? "Cập nhật khoản chi" : "Thêm khoản chi"}</h3>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <form className="sheet-form" onSubmit={handleSubmit}>
          <label>
            Tổng tiền
            <input type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>

          <label>
            Mô tả
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>

          <div className="receipt-upload-card">
            <div className="receipt-upload-header">
              <div>
                <strong>Chụp hoặc tải ảnh hóa đơn</strong>
                <p>{uploadingImage ? "Đang tải ảnh lên server..." : "Ảnh sẽ được lưu ngay trên server và gắn vào khoản chi."}</p>
              </div>
              <button className="secondary-button" onClick={() => fileInputRef.current?.click()} type="button">
                {uploadingImage ? "Đang tải..." : "Chọn ảnh"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleImagePick}
              type="file"
            />
            {imageUrl && (
              <div className="receipt-preview">
                <img alt="Ảnh hóa đơn" src={imageUrl} />
                <a href={imageUrl} rel="noreferrer" target="_blank">
                  Xem ảnh đầy đủ
                </a>
              </div>
            )}
          </div>

          <div className="readonly-grid">
            <div className="readonly-field">
              <span>Ngày chi</span>
              <strong>{formatDate(expenseDate)}</strong>
            </div>
            <div className="readonly-field">
              <span>Người thanh toán</span>
              <strong>{activeUsers.find((member) => member.id === payerId)?.fullName || currentUser.fullName}</strong>
            </div>
          </div>

          <div className="split-toggle">
            <button
              className={splitType === "EQUAL" ? "toggle-button active" : "toggle-button"}
              onClick={() => setSplitType("EQUAL")}
              type="button"
            >
              Chia đều
            </button>
            <button
              className={splitType === "AMOUNT" ? "toggle-button active" : "toggle-button"}
              onClick={() => setSplitType("AMOUNT")}
              type="button"
            >
              Chia theo số tiền
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
              <span>Tổng hóa đơn</span>
              <strong>{formatCurrency(numericAmount)}</strong>
            </div>
            <div>
              <span>Tổng đã chia</span>
              <strong>{formatCurrency(splitType === "EQUAL" ? equalPreview.reduce((sum, item) => sum + item, 0) : manualTotal)}</strong>
            </div>
          </div>

          {formError && <p className="error-text">{formError}</p>}

          <div className="sheet-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Đóng
            </button>
            <button className="primary-button" type="submit">
              {initialExpense ? "Lưu thay đổi" : "Lưu khoản chi"}
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
  canManage,
  compact,
  onEdit,
  onDelete
}: {
  expense: Expense;
  canManage?: boolean;
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
            {expense.payerName} thanh toán · {formatDate(expense.expenseDate)}
          </p>
          <p>{expense.shares.map((share) => `${share.fullName}: ${formatCurrency(share.shareAmount)}`).join(" · ")}</p>
          {expense.imageUrl && (
            <>
              <img className="expense-receipt-image" alt="Ảnh hóa đơn" src={expense.imageUrl} />
              <p>
              <a href={expense.imageUrl} rel="noreferrer" target="_blank">
                Xem ảnh hóa đơn
              </a>
              </p>
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
    script.onerror = () => reject(new Error("Không tải được Google script"));
    document.head.appendChild(script);
  });
}

function summarizeGoogleCredential(credential: string) {
  const payload = parseJwtPayload(credential);
  return {
    length: credential.length,
    aud: payload?.aud ?? null,
    iss: payload?.iss ?? null,
    email: payload?.email ?? null,
    sub: maskValue(payload?.sub),
    exp: payload?.exp ?? null
  };
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = window.atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function maskValue(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  if (value.length <= 8) {
    return value;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
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
      return "Trang chủ";
    case "expenses":
      return "Khoản chi";
    case "reports":
      return "Báo cáo";
    case "account":
      return "Tài khoản";
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
