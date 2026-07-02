export function getAppConfig() {
  const runtimeConfig = window.__APP_CONFIG__ || {};

  return {
    appName: runtimeConfig.APP_NAME || "Sổ Chi Tiêu",
    apiBaseUrl: runtimeConfig.API_BASE_URL || "/api",
    googleClientId: runtimeConfig.GOOGLE_CLIENT_ID || "",
  };
}
