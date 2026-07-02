import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8080";

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "pwa-192.svg", "pwa-512.svg"],
        workbox: {
          globIgnores: ["**/runtime-config.js"]
        },
        manifest: {
          name: "A1.403",
          short_name: "A1.403",
          description: "Ung dung quan ly chi tieu gia dinh toi uu cho thiet bi di dong.",
          theme_color: "#0f766e",
          background_color: "#f7f8f5",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "/pwa-192.svg",
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "any"
            },
            {
              src: "/pwa-512.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any maskable"
            }
          ]
        }
      })
    ],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
