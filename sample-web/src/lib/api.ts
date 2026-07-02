import type {
  AuthResponse,
  DashboardResponse,
  Expense,
  ExpensePayload,
  FileUploadResponse,
  MonthlyReport,
  Settlement,
  SettlementStatus,
  User,
  UserOption,
  UserRole
} from "../types";

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
    readonly payload: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => string
  ) {}

  loginWithGoogle(credential: string) {
    return this.request<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential })
    });
  }

  uploadExpenseImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.multipartRequest<FileUploadResponse>("/uploads/expenses", {
      method: "POST",
      body: formData
    });
  }

  getMe() {
    return this.request<User>("/users/me");
  }

  getUsers() {
    return this.request<UserOption[]>("/users");
  }

  getAdminUsers() {
    return this.request<UserOption[]>("/users/admin");
  }

  updateUserRole(userId: number, role: UserRole) {
    return this.request<User>(`/users/admin/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role })
    });
  }

  updateUserStatus(userId: number, active: boolean) {
    return this.request<User>(`/users/admin/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ active })
    });
  }

  getDashboard() {
    return this.request<DashboardResponse>("/dashboard");
  }

  getExpenses() {
    return this.request<Expense[]>("/expenses");
  }

  createExpense(payload: ExpensePayload) {
    return this.request<Expense>("/expenses", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  updateExpense(expenseId: number, payload: ExpensePayload) {
    return this.request<Expense>(`/expenses/${expenseId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  deleteExpense(expenseId: number) {
    return this.request<void>(`/expenses/${expenseId}`, {
      method: "DELETE"
    });
  }

  getMonthlyReport(year: number, month: number) {
    return this.request<MonthlyReport>(`/reports/monthly?year=${year}&month=${month}`);
  }

  getSettlements(year: number, month: number) {
    return this.request<Settlement[]>(`/settlements?year=${year}&month=${month}`);
  }

  generateSettlements(year: number, month: number) {
    return this.request<Settlement[]>("/settlements/generate", {
      method: "POST",
      body: JSON.stringify({ year, month })
    });
  }

  updateSettlementStatus(settlementId: number, status: SettlementStatus) {
    return this.request<Settlement>(`/settlements/${settlementId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(init.headers);
    const method = init.method || "GET";
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    headers.set("Content-Type", "application/json");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...init,
      headers
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[api] request failed", {
        method,
        url,
        status: response.status,
        payload
      });
      throw new ApiError(
        payload.message || `Yeu cau that bai. (${response.status})`,
        response.status,
        url,
        payload
      );
    }

    if (path === "/auth/google") {
      console.info("[api] google login response", {
        method,
        url,
        status: response.status,
        userId: (payload as Partial<AuthResponse>)?.user?.id,
        email: (payload as Partial<AuthResponse>)?.user?.email
      });
    }

    return payload as T;
  }

  private async multipartRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(init.headers);
    const method = init.method || "POST";
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...init,
      headers
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[api] multipart request failed", {
        method,
        url,
        status: response.status,
        payload
      });
      throw new ApiError(
        (payload as { message?: string }).message || `Yeu cau that bai. (${response.status})`,
        response.status,
        url,
        payload
      );
    }

    return payload as T;
  }
}
