interface StatusLayerProps {
  error: string;
  loading: boolean;
  message: string;
}

export function StatusLayer({ error, loading, message }: StatusLayerProps) {
  if (!loading && !message && !error) {
    return null;
  }

  return (
    <div className="status-layer" role="status" aria-live="polite">
      {loading && <div className="status-banner">Đang tải dữ liệu...</div>}
      {message && <div className="status-banner success">{message}</div>}
      {error && <div className="status-banner error">{error}</div>}
    </div>
  );
}
