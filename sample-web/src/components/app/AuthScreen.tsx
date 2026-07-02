import type { RefObject } from "react";

interface AuthScreenProps {
  authenticating: boolean;
  error: string;
  googleClientId: string;
  googleButtonRef: RefObject<HTMLDivElement | null>;
  message: string;
}

export function AuthScreen({
  authenticating,
  error,
  googleButtonRef,
  googleClientId,
  message
}: AuthScreenProps) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">₫</div>
        <p className="eyebrow">Family Expense PWA</p>
        <h1>Quản lý chi tiêu gia đình trong một chạm</h1>
        <p className="lead">
          Đăng nhập bằng Google, backend sẽ tạo JWT riêng cho hệ thống và frontend sử dụng Bearer Token cho toàn bộ API.
        </p>
        {googleClientId ? (
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
