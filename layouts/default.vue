<template>
  <div class="app-shell">
    <nav class="sidebar" :class="{ open: sidebarOpen }" aria-label="Main navigation">
      <div class="sidebar-logo">
        <span class="logo-icon" aria-hidden="true">🦛</span>
        <span class="logo-text">WAHA</span>
      </div>

      <div class="nav-section">
        <div class="nav-section-label">{{ t("nav.overview") }}</div>
        <NuxtLink to="/" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">⊞</span> {{ t("nav.dashboard") }}
        </NuxtLink>
        <NuxtLink to="/event-monitor" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">◉</span> {{ t("nav.eventMonitor") }}
        </NuxtLink>
      </div>

      <div class="nav-section">
        <div class="nav-section-label">{{ t("nav.sessions") }}</div>
        <NuxtLink to="/Sessions" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">◎</span> {{ t("nav.sessionsItem") }}
        </NuxtLink>
        <NuxtLink to="/Workers" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">⛭</span> {{ t("nav.workers") }}
        </NuxtLink>
      </div>

      <div class="nav-section">
        <div class="nav-section-label">{{ t("nav.messaging") }}</div>
        <NuxtLink to="/plus/templates" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">▣</span> {{ t("nav.templates") }}
        </NuxtLink>
        <NuxtLink to="/plus/autoreply" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">↩</span> {{ t("nav.autoReply") }}
        </NuxtLink>
        <NuxtLink to="/plus/schedule" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">◷</span> {{ t("nav.scheduling") }}
        </NuxtLink>
        <NuxtLink to="/plus/contacts" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">◑</span> {{ t("nav.contacts") }}
        </NuxtLink>
        <NuxtLink to="/channels" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">📢</span> {{ t("nav.channels") }}
        </NuxtLink>
      </div>

      <div class="nav-section">
        <div class="nav-section-label">{{ t("nav.analytics") }}</div>
        <NuxtLink to="/plus/analytics" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">▲</span> {{ t("nav.analyticsItem") }}
        </NuxtLink>
      </div>

      <div class="nav-section">
        <div class="nav-section-label">{{ t("nav.settings") }}</div>
        <NuxtLink to="/Settings" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">⚙</span> {{ t("nav.settingsItem") }}
        </NuxtLink>
        <NuxtLink to="/plus/apikeys" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">⚿</span> {{ t("nav.apiKeys") }}
        </NuxtLink>
        <NuxtLink to="/plus/engines" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">◈</span> {{ t("nav.engines") }}
        </NuxtLink>
        <NuxtLink to="/plus/mcp" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">⬡</span> {{ t("nav.mcp") }}
        </NuxtLink>
        <NuxtLink to="/plus/skills" class="nav-item" @click="closeSidebar">
          <span class="nav-icon">✧</span> {{ t("nav.skills") }}
        </NuxtLink>
      </div>
    </nav>

    <div class="content-area">
      <header class="topbar">
        <button class="menu-btn" @click="sidebarOpen = !sidebarOpen" :aria-expanded="sidebarOpen" aria-label="Toggle navigation menu">
          <span>☰</span>
        </button>
        <span class="topbar-title">{{ pageTitle }}</span>
        <span
          class="ws-indicator"
          :class="{ live: rtConnected }"
          :title="rtConnected ? 'Realtime connected' : 'Realtime offline — polling'"
        />
        <div class="topbar-spacer" />
        <button
          class="topbar-link theme-toggle"
          :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          :title="isDark ? 'Light theme' : 'Dark theme'"
          @click="toggleTheme"
        >
          {{ isDark ? "☀" : "☾" }}
        </button>
        <button
          class="topbar-link theme-toggle"
          :title="locale === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'"
          @click="toggleLocale"
        >
          {{ locale === "id" ? "EN" : "ID" }}
        </button>
        <a
          href="https://waha.devlike.pro/docs"
          target="_blank"
          rel="noopener"
          class="topbar-link"
          aria-label="WAHA documentation (opens in new tab)"
          >{{ t("topbar.docs") }}</a
        >
      </header>

      <main>
        <StatusAlertBanner @jump="goToSessions" />
        <slot />
      </main>
    </div>

    <WahaToasts />
    </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { t, locale, toggleLocale } = useLocale();

const sidebarOpen = useState<boolean>("waha_sidebar_open", () => false);
useGlobalModalTrap();

const { connected: rtConnected, ensureConnected: rtEnsure } = useWahaRealtime();
const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/Sessions": "Sessions",
  "/Workers": "Workers",
  "/event-monitor": "Event Monitor",
  "/plus": "Plus Dashboard",
  "/plus/sessions": "Session Manager",
  "/Settings": "Settings",
  "/channels": "Channels",
  "/plus/analytics": "Analytics",
  "/plus/schedule": "Scheduling",
  "/plus/templates": "Templates",
  "/plus/autoreply": "Auto-Reply",
  "/plus/apikeys": "API Keys",
  "/plus/contacts": "Contacts",
  "/plus/mcp": "MCP Server",
  "/plus/engines": "Engines",
  "/plus/skills": "Claude Skills",
};

const pageTitle = computed(() => pageTitles[route.path] ?? "WAHA");

function closeSidebar() {
  sidebarOpen.value = false;
}

const router = useRouter();
function goToSessions() {
  router.push("/Sessions");
}

// Theme: persisted in localStorage, applied via [data-theme] on <html>
const isDark = useState<boolean>("waha_theme_dark", () => true);

function applyTheme() {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(
    "data-theme",
    isDark.value ? "dark" : "light",
  );
}

function toggleTheme() {
  isDark.value = !isDark.value;
  localStorage.setItem("waha_theme", isDark.value ? "dark" : "light");
  applyTheme();
}

onMounted(() => {
  const saved = localStorage.getItem("waha_theme");
  if (saved === "light" || saved === "dark") {
    isDark.value = saved === "dark";
  }
  applyTheme();
  rtEnsure();
  const { setLocale } = useLocale();
  const savedLocale = localStorage.getItem("waha_locale");
  if (savedLocale === "id" || savedLocale === "en") {
    setLocale(savedLocale);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarOpen.value) sidebarOpen.value = false;
  });
});
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: var(--nav-width);
  background: var(--nav-bg);
  border-right: 1px solid var(--border);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  padding: 0 0 24px 0;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 200;
  transition: transform 0.25s ease;
}

.content-area {
  margin-left: var(--nav-width);
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}

.logo-icon {
  font-size: 22px;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 1px;
}

.nav-section {
  padding: 0 12px;
  margin-bottom: 8px;
}

.nav-section-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 8px 8px 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.plus-badge {
  font-size: 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.15s;
  margin-bottom: 2px;
}

.nav-item:hover {
  background: rgba(34, 197, 94, 0.08);
  color: var(--text);
}

.nav-item.router-link-active {
  background: rgba(34, 197, 94, 0.12);
  color: var(--accent);
  border-left: 2px solid var(--accent);
  padding-left: 8px;
}

.nav-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}

.topbar {
  height: var(--topbar-height);
  background: rgba(8, 12, 10, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.topbar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.topbar-spacer {
  flex: 1;
}

.topbar-link {
  font-size: 12px;
  color: var(--text-dim);
}

.topbar-link:hover {
  color: var(--accent);
}

.menu-btn {
  display: none;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  padding: 6px 10px;
  min-width: 44px;
  min-height: 44px;
  border-radius: var(--radius-sm);
  font-size: 16px;
}

.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  /* Keep the hamburger tappable above the open sidebar so it can toggle
     closed (sidebar z-index 200 would otherwise cover the whole topbar). */
  .topbar {
    z-index: 250;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .content-area {
    margin-left: 0;
  }

  .menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 150;
  }
}

.ws-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-dim);
  display: inline-block;
  margin-right: 2px;
  flex-shrink: 0;
}

.ws-indicator.live {
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent-glow);
}

.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  line-height: 1.2;
}

.theme-toggle:hover {
  background: var(--surface-hover);
}
</style>
