/// <reference types="vite/client" />

interface Window {
  __APP_CONFIG__?: {
    APP_NAME?: string;
    API_BASE_URL?: string;
    GOOGLE_CLIENT_ID?: string;
  };
  google?: any;
}
