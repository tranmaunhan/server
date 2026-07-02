import { useEffect, useRef, useState, type TouchEvent } from "react";
import { AccountTab } from "./components/app/AccountTab";
import { AuthScreen } from "./components/app/AuthScreen";
import { BottomNav } from "./components/app/BottomNav";
import { ExpenseFormSheet } from "./components/app/ExpenseFormSheet";
import { ExpensesTab } from "./components/app/ExpensesTab";
import { HomeTab } from "./components/app/HomeTab";
import { ReportsTab } from "./components/app/ReportsTab";
import { StatusLayer } from "./components/app/StatusLayer";
import { tabTitle, type TabKey } from "./components/app/nav";
import { ApiClient } from "./lib/api";
import { getAppConfig } from "./lib/config";
import { compressImageForUpload } from "./lib/image";
import { fallbackAvatar } from "./lib/ui";
import { clearToken, clearUser, getToken, getUser, saveToken, saveUser } from "./lib/storage";
import type {
  DashboardResponse,
  Expense,
  ExpensePayload,
  MonthlyReport,
  Settlement,
  User,
  UserOption,
  UserRole
} from "./types";

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
    document.title = config.appName;
  }, []);

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
        apiBaseUrl: config.apiBaseUrl,
        origin: window.location.origin
      });
      return;
    }

    console.info("[auth] runtime config loaded", {
      apiBaseUrl: config.apiBaseUrl,
      googleClientIdPreview: maskValue(config.googleClientId),
      origin: window.location.origin
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
      locale: "vi",
      logo_alignment: "left",
      shape: "pill",
      size: "large",
      text: "continue_with",
      theme: "filled_blue",
      type: "standard",
      width: 320
    });
    buttonRenderedRef.current = true;
  }, [googleReady, user]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage("");
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setError("");
    }, 4200);

    return () => window.clearTimeout(timeout);
  }, [error]);

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
      setMessage("Đã làm mới dữ liệu.");
    } catch (refreshError) {
      handleApiError(refreshError);
    } finally {
      setPullRefreshing(false);
      resetPullState();
    }
  }

  function handleAppTouchStart(event: TouchEvent<HTMLElement>) {
    if (!canStartPullRefresh()) {
      resetPullState();
      return;
    }

    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    pullActiveRef.current = false;
  }

  function handleAppTouchMove(event: TouchEvent<HTMLElement>) {
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
        credential: summarizeGoogleCredential(credential),
        loginUrl: `${config.apiBaseUrl}/auth/google`
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
      type: uploadFile.type,
      uploadName: uploadFile.name,
      uploadSize: uploadFile.size
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

  async function handleSettlementStatus(settlementId: number) {
    try {
      await api.updateSettlementStatus(settlementId, "PAID");
      setMessage("Đã xác nhận đã nhận tiền.");
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

  function closeExpenseForm() {
    setShowExpenseForm(false);
    setEditingExpense(null);
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
  const pullOffset =
    pullDistance > 0 || pullRefreshing ? Math.max(pullDistance, pullRefreshing ? PULL_REFRESH_HOLD : 0) : 0;
  const pullLabel = pullRefreshing
    ? "Đang làm mới dữ liệu..."
    : pullDistance >= PULL_REFRESH_THRESHOLD
      ? "Thả tay để làm mới"
      : "Kéo xuống để làm mới";

  if (!user) {
    return (
      <AuthScreen
        appName={config.appName}
        authenticating={authenticating}
        error={error}
        googleButtonRef={googleButtonRef}
        googleClientId={config.googleClientId}
        message={message}
      />
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

      <StatusLayer error={error} loading={loading} message={message} />

      <div className="pull-refresh-shell" style={{ transform: `translateY(${pullOffset}px)` }}>
        <header className={activeTab === "home" ? "topbar home-topbar" : "topbar"}>
          <div>
            <p className="eyebrow">{activeTab === "home" ? `Chào, ${user.fullName}` : config.appName}</p>
            <h1>{tabTitle(activeTab)}</h1>
          </div>
          <button className="topbar-avatar" onClick={() => setActiveTab("account")} type="button">
            <img alt={user.fullName} src={user.avatarUrl || fallbackAvatar(user.fullName)} />
          </button>
        </header>

        <section className="screen-content">
          {activeTab === "home" && <HomeTab dashboard={dashboard} user={user} />}

          {activeTab === "expenses" && (
            <ExpensesTab
              currentUser={user}
              expenses={expenses}
              onCreate={openCreateExpense}
              onDelete={handleDeleteExpense}
              onEdit={openEditExpense}
            />
          )}

          {activeTab === "reports" && (
            <ReportsTab
              currentUser={user}
              month={month}
              onGenerateSettlements={handleGenerateSettlements}
              onPeriodChange={refreshPeriodData}
              onSettlementStatus={handleSettlementStatus}
              report={report}
              settlements={settlements}
              year={year}
            />
          )}

          {activeTab === "account" && (
            <AccountTab
              currentUser={user}
              onLogout={logout}
              onUserRoleChange={handleUserRoleChange}
              onUserStatusChange={handleUserStatusChange}
              users={adminUsers}
            />
          )}
        </section>
      </div>

      <button className="fab-button" onClick={openCreateExpense} type="button" aria-label="Thêm khoản chi">
        +
      </button>

      <BottomNav activeTab={activeTab} onSelect={setActiveTab} />

      {showExpenseForm && (
        <ExpenseFormSheet
          currentUser={user}
          initialExpense={editingExpense}
          onClose={closeExpenseForm}
          onSave={handleSaveExpense}
          onUploadImage={handleUploadExpenseImage}
          users={users}
        />
      )}
    </main>
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
    aud: payload?.aud ?? null,
    email: payload?.email ?? null,
    exp: payload?.exp ?? null,
    iss: payload?.iss ?? null,
    length: credential.length,
    sub: maskValue(payload?.sub)
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
