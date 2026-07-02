import { useEffect, useRef, useState } from "react";
import { getAppConfig } from "./config";

const TOKEN_STORAGE_KEY = "expense-manager.google-token";
const USER_STORAGE_KEY = "expense-manager.user";
const GOOGLE_SCRIPT_ID = "google-identity-services";
const initialConfig = getAppConfig();

export default function App() {
  const [health, setHealth] = useState(null);
  const [user, setUser] = useState(() => readStoredUser());
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || "");
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Đang chuẩn bị kết nối hệ thống...");
  const [googleReady, setGoogleReady] = useState(false);
  const buttonContainerRef = useRef(null);
  const buttonRenderedRef = useRef(false);

  useEffect(() => {
    loadHealth();
  }, []);

  useEffect(() => {
    if (!initialConfig.googleClientId) {
      setLoading(false);
      setStatus("Chưa cấu hình Google Client ID cho frontend.");
      return;
    }

    let active = true;

    loadGoogleScript()
      .then(() => {
        if (active) {
          setGoogleReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setError("Không tải được thư viện đăng nhập Google.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    restoreSession(token);
  }, [token]);

  useEffect(() => {
    if (!googleReady || !buttonContainerRef.current || !initialConfig.googleClientId || user) {
      return;
    }

    if (buttonRenderedRef.current || !window.google?.accounts?.id) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: initialConfig.googleClientId,
      callback: async (response) => {
        if (!response?.credential) {
          setError("Google không trả về token đăng nhập.");
          return;
        }

        await handleGoogleLogin(response.credential);
      },
    });

    buttonContainerRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonContainerRef.current, {
      theme: "outline",
      size: "large",
      type: "standard",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "left",
      width: 320,
      locale: "vi",
    });

    buttonRenderedRef.current = true;
  }, [googleReady, user]);

  async function loadHealth() {
    try {
      const response = await fetch(buildApiUrl("/health"));
      if (!response.ok) {
        throw new Error("Không lấy được trạng thái backend.");
      }

      setHealth(await response.json());
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function restoreSession(currentToken) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(buildApiUrl("/users/me"), {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      }

      const currentUser = await response.json();
      persistSession(currentToken, currentUser);
      setStatus("Đã khôi phục phiên đăng nhập.");
    } catch (restoreError) {
      clearSession();
      setError(restoreError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin(credential) {
    setAuthenticating(true);
    setError("");
    setStatus("Đang xác thực tài khoản Google...");

    try {
      const response = await fetch(buildApiUrl("/auth/google"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Đăng nhập Google thất bại.");
      }

      persistSession(credential, payload.user);
      setStatus("Đăng nhập thành công, hệ thống đã lưu thông tin người dùng.");
    } catch (loginError) {
      clearSession();
      setError(loginError.message);
    } finally {
      setAuthenticating(false);
      setLoading(false);
    }
  }

  function persistSession(nextToken, nextUser) {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken("");
    setUser(null);
    buttonRenderedRef.current = false;
    if (buttonContainerRef.current) {
      buttonContainerRef.current.innerHTML = "";
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Expense Manager Starter</p>
          <h1>{initialConfig.appName}</h1>
          <p className="lead">
            Bộ khởi đầu cho hệ thống quản lý chi tiêu với React, Spring Boot và PostgreSQL.
            Luồng đầu tiên đã sẵn sàng là đăng nhập Google và đồng bộ người dùng vào cơ sở dữ liệu.
          </p>

          <div className="feature-list">
            <article className="feature-card">
              <strong>Backend chuẩn layer</strong>
              <span>Entity, Repository, Service, ServiceImpl, Controller và Mapper đã được tách riêng.</span>
            </article>
            <article className="feature-card">
              <strong>Không hardcode key</strong>
              <span>Google Client ID, API base và các kết nối đều lấy từ env/runtime config.</span>
            </article>
            <article className="feature-card">
              <strong>Sẵn sàng mở rộng</strong>
              <span>Bạn có thể thêm module ví tiền, khoản thu, khoản chi và báo cáo trên cùng khung này.</span>
            </article>
          </div>
        </div>

        <div className="status-stack">
          <article className="glass-card">
            <p className="card-label">Trạng thái hệ thống</p>
            {health ? (
              <div className="metric-list">
                <div>
                  <span>Backend</span>
                  <strong>{health.service}</strong>
                </div>
                <div>
                  <span>Cơ sở dữ liệu</span>
                  <strong>{health.database}</strong>
                </div>
                <div>
                  <span>Người dùng</span>
                  <strong>{health.registeredUsers}</strong>
                </div>
              </div>
            ) : (
              <p className="muted">Đang tải trạng thái backend...</p>
            )}
          </article>

          <article className="glass-card">
            <p className="card-label">Runtime config</p>
            <ul className="config-list">
              <li>
                <span>Tên ứng dụng</span>
                <strong>{initialConfig.appName}</strong>
              </li>
              <li>
                <span>API base</span>
                <strong>{initialConfig.apiBaseUrl}</strong>
              </li>
              <li>
                <span>Google Client ID</span>
                <strong>{initialConfig.googleClientId ? "Đã cấu hình" : "Chưa cấu hình"}</strong>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="workspace-grid">
        <article className="panel auth-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Xác thực</p>
              <h2>Đăng nhập Google</h2>
            </div>
            {user && (
              <button className="ghost-button" onClick={clearSession} type="button">
                Đăng xuất
              </button>
            )}
          </div>

          {loading && <p className="muted">Đang kiểm tra phiên đăng nhập...</p>}

          {!loading && !user && (
            <>
              <p className="muted">
                Nhấn đăng nhập để backend xác thực Google ID Token, lưu người dùng vào PostgreSQL và trả
                về hồ sơ chuẩn DTO.
              </p>
              <div className="google-box">
                <div ref={buttonContainerRef} />
              </div>
            </>
          )}

          {user && (
            <div className="user-card">
              <div className="user-top">
                <img alt={user.fullName} src={user.avatarUrl || fallbackAvatar(user.fullName)} />
                <div>
                  <h3>{user.fullName}</h3>
                  <p>{user.email}</p>
                </div>
              </div>

              <dl className="details-grid">
                <div>
                  <dt>Email đã xác minh</dt>
                  <dd>{user.emailVerified ? "Có" : "Không"}</dd>
                </div>
                <div>
                  <dt>Locale</dt>
                  <dd>{user.locale || "vi"}</dd>
                </div>
                <div>
                  <dt>Lần đăng nhập gần nhất</dt>
                  <dd>{formatDate(user.lastLoginAt)}</dd>
                </div>
                <div>
                  <dt>Ngày tạo tài khoản nội bộ</dt>
                  <dd>{formatDate(user.createdAt)}</dd>
                </div>
              </dl>
            </div>
          )}

          {authenticating && <p className="muted">Đang xác thực với backend...</p>}
          {status && <p className="status-text">{status}</p>}
          {error && <p className="error-text">{error}</p>}
        </article>

        <article className="panel roadmap-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Lộ trình</p>
              <h2>Bước tiếp theo cho dự án quản lý chi tiêu</h2>
            </div>
          </div>

          <div className="roadmap-list">
            <div className="roadmap-item">
              <strong>1. Hồ sơ người dùng</strong>
              <span>Lưu múi giờ, tiền tệ mặc định, ngôn ngữ và ảnh đại diện.</span>
            </div>
            <div className="roadmap-item">
              <strong>2. Ví và tài khoản</strong>
              <span>Tạo bảng wallet, bank_account và phân quyền theo user đã đăng nhập.</span>
            </div>
            <div className="roadmap-item">
              <strong>3. Giao dịch thu chi</strong>
              <span>Thêm category, transaction, recurring transaction và API báo cáo theo tháng.</span>
            </div>
            <div className="roadmap-item">
              <strong>4. Dashboard</strong>
              <span>Biểu đồ chi tiêu, cảnh báo vượt ngân sách và thống kê realtime theo người dùng.</span>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

function buildApiUrl(pathname) {
  const normalizedBase = (initialConfig.apiBaseUrl || "/api").replace(/\/$/, "");
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${normalizedBase}${normalizedPath}`;
}

function readStoredUser() {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function fallbackAvatar(name) {
  const initials = (name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="48" fill="#E8F3EF" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#1E3D34">
        ${initials || "U"}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function formatDate(value) {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
