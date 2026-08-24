// Lightweight ID/EN locale for the dashboard chrome (nav, common buttons,
// banners). Pages keep their English copy unless a key is wired up — this is
// deliberately not a full i18n framework, just consistent chrome translation.

const messages = {
  id: {
    "nav.overview": "Ringkasan",
    "nav.sessions": "Sesi",
    "nav.messaging": "Pesan",
    "nav.analytics": "Analitik",
    "nav.settings": "Pengaturan",
    "nav.dashboard": "Dasbor",
    "nav.eventMonitor": "Monitor Event",
    "nav.sessionsItem": "Sesi",
    "nav.workers": "Worker",
    "nav.templates": "Template",
    "nav.autoReply": "Balasan Otomatis",
    "nav.scheduling": "Penjadwalan",
    "nav.contacts": "Kontak",
    "nav.channels": "Channels",
    "nav.analyticsItem": "Analitik",
    "nav.settingsItem": "Pengaturan",
    "nav.apiKeys": "Kunci API",
    "nav.engines": "Engine",
    "nav.mcp": "Server MCP",
    "nav.skills": "Claude Skills",
    "topbar.docs": "Dokumentasi ↗",
    "banner.viewSessions": "Lihat Sesi →",
    "action.refresh": "⟳ Muat ulang",
    "action.close": "Tutup",
    "action.delete": "✕ Hapus",
    "action.start": "▶ Mulai",
    "action.stop": "⏹ Berhenti",
    "action.restart": "↻ Restart",
    "action.newSession": "+ Sesi Baru",
    "action.recoverFailed": "🔄 Pulihkan Gagal",
    "action.startAll": "▶ Mulai Semua",
    "action.stopAll": "⏹ Hentikan Semua",
    "stat.total": "Total",
    "stat.working": "Aktif",
    "stat.failed": "Gagal",
    "stat.stopped": "Berhenti",
    "stat.scanQr": "Scan QR",
    "filter.all": "Semua",
    "alert.failedSessions": "{n} sesi gagal",
    "alert.qrSessions": "{n} sesi menunggu scan QR",
  },
  en: {
    "nav.overview": "Overview",
    "nav.sessions": "Sessions",
    "nav.messaging": "Messaging",
    "nav.analytics": "Analytics",
    "nav.settings": "Settings",
    "nav.dashboard": "Dashboard",
    "nav.eventMonitor": "Event Monitor",
    "nav.sessionsItem": "Sessions",
    "nav.workers": "Workers",
    "nav.templates": "Templates",
    "nav.autoReply": "Auto-Reply",
    "nav.scheduling": "Scheduling",
    "nav.contacts": "Contacts",
    "nav.channels": "Channels",
    "nav.analyticsItem": "Analytics",
    "nav.settingsItem": "Settings",
    "nav.apiKeys": "API Keys",
    "nav.engines": "Engines",
    "nav.mcp": "MCP Server",
    "nav.skills": "Claude Skills",
    "topbar.docs": "Docs ↗",
    "banner.viewSessions": "View Sessions →",
    "action.refresh": "⟳ Refresh",
    "action.close": "Close",
    "action.delete": "✕ Delete",
    "action.start": "▶ Start",
    "action.stop": "⏹ Stop",
    "action.restart": "↻ Restart",
    "action.newSession": "+ New Session",
    "action.recoverFailed": "🔄 Recover Failed",
    "action.startAll": "▶ Start All",
    "action.stopAll": "⏹ Stop All",
    "stat.total": "Total",
    "stat.working": "Working",
    "stat.failed": "Failed",
    "stat.stopped": "Stopped",
    "stat.scanQr": "Scan QR",
    "filter.all": "All",
    "alert.failedSessions": "{n} session(s) failed",
    "alert.qrSessions": "{n} session(s) waiting for QR scan",
  },
} as const;

export type Locale = "id" | "en";
export type MessageKey = keyof typeof messages.id;

const locale = useState<Locale>("waha_locale", () => "en");

export function useLocale() {
  function t(key: MessageKey, params?: Record<string, string | number>): string {
    let out: string = messages[locale.value][key] ?? messages.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        out = out.replace(`{${k}}`, String(v));
      }
    }
    return out;
  }

  function setLocale(next: Locale) {
    locale.value = next;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("waha_locale", next);
    }
  }

  function toggleLocale() {
    setLocale(locale.value === "id" ? "en" : "id");
  }

  return { locale, t, toggleLocale };
}
