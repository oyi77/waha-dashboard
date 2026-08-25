export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: false },
  ssr: false,

  app: {
    baseURL: "/dashboard/",
    buildAssetsDir: "/_nuxt/",
    head: {
      title: "WAHA Dashboard",
      link: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/dashboard/favicon.svg",
        },
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap",
        },
        {
          rel: "manifest",
          href: "/dashboard/manifest.webmanifest",
        },
      ],
      meta: [
        { name: "theme-color", content: "#16a34a" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      ],
    },
  },

  css: ["~/assets/css/main.css"],

  vite: {
    build: {
      rollupOptions: {
        output: {
          // Stable vendor chunk so app-code deploys don't invalidate the
          // framework cache for returning browsers.
          manualChunks: {
            vendor: ["vue", "vue-router"],
          },
        },
      },
    },
  },

  nitro: {
    preset: "static",
  },
});
