export interface AppConfig {
  appName: string;
  apiBaseUrl: string;
  googleClientId: string;
}

export function getAppConfig(): AppConfig {
  const runtimeConfig = window.__APP_CONFIG__ || {};

  return {
    appName: runtimeConfig.APP_NAME || "Family Expense PWA",
    apiBaseUrl: runtimeConfig.API_BASE_URL || "/api",
    googleClientId: runtimeConfig.GOOGLE_CLIENT_ID || ""
  };
}
