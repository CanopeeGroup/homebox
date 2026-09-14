import { defineNuxtConfig } from "nuxt/config";

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  ssr: false,

  components: {
    dirs: [],
  },

  build: {
    transpile: ["vue-i18n"],
  },

  modules: [
    "@nuxtjs/tailwindcss",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@vite-pwa/nuxt",
    "unplugin-icons/nuxt",
    "shadcn-nuxt",
    "@nuxt/eslint",
  ],

  eslint: {
    config: {},
  },

  // Runtime config for OpenTelemetry
  // Note: otelEnabled is determined automatically by querying the backend status endpoint.
  // When the backend has telemetry enabled, the frontend will automatically enable it.
  runtimeConfig: {
    public: {
      // OpenTelemetry configuration (can be overridden by environment variables)
      otelServiceName: process.env.NUXT_PUBLIC_OTEL_SERVICE_NAME || "homebox-frontend",
      otelServiceVersion: process.env.NUXT_PUBLIC_OTEL_SERVICE_VERSION || "1.0.0",
      otelSampleRate: process.env.NUXT_PUBLIC_OTEL_SAMPLE_RATE || "1.0",
      otelDebug: process.env.NUXT_PUBLIC_OTEL_DEBUG || "false",
    },
  },

  nitro: {
    devProxy: {
      "/api": {
        target: "http://localhost:7745/api",
        ws: true,
        changeOrigin: true,
      },
    },
  },

  app: {
    head: {
      script: [{ src: "/set-theme.js" }],
      meta: [
        { name: "theme-color", content: "#5b7f67" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-title", content: "Homebox" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      ],
      link: [{ rel: "apple-touch-icon", href: "/pwa-192x192.png" }],
    },
  },

  css: ["@/assets/css/main.css"],

  pwa: {
    strategies: "generateSW",
    includeAssets: ["favicon.svg", "pwa-192x192.png", "pwa-512x512.png"],
    workbox: {
      globPatterns: ["**/*.{js,css,html,png,svg,woff,woff2}"],
      navigateFallback: "/",
      navigateFallbackDenylist: [/^\/api/],
      cleanupOutdatedCaches: true,
      importScripts: ["/pwa-cache-cleanup.js"],
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname === "/api" || url.pathname.startsWith("/api/"),
          handler: "NetworkOnly",
          method: "GET",
        },
      ],
    },
    registerType: "autoUpdate",
    injectRegister: "script",
    devOptions: {
      // Enable to troubleshoot during development
      enabled: false,
    },
    manifest: {
      name: "Homebox",
      short_name: "Homebox",
      description: "Gestion des objets, des produits et des emplacements",
      id: "/",
      scope: "/",
      lang: "fr",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#5b7f67",
      start_url: "/locations",
      icons: [
        {
          src: "pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  compatibilityDate: "2024-11-29",
});
