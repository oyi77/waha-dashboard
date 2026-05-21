<template>
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <div class="page-title">⚙ Settings</div>
        <div class="page-subtitle">WAHA configuration and preferences</div>
      </div>
    </div>

    <div class="settings-sections">
      <!-- Session Health -->
      <div class="settings-section card">
        <div class="section-title">
          <span class="section-icon">💚</span>
          Session Health
        </div>
        <div v-if="healthLoading" class="health-loading">
          Loading health data...
        </div>
        <div v-else-if="healthData" class="health-grid">
          <div class="health-card health-total">
            <div class="health-value">{{ healthData.total }}</div>
            <div class="health-label">Total</div>
          </div>
          <div class="health-card health-working">
            <div class="health-value">{{ healthData.working }}</div>
            <div class="health-label">Working</div>
          </div>
          <div class="health-card health-failed">
            <div class="health-value">{{ healthData.failed }}</div>
            <div class="health-label">Failed</div>
          </div>
          <div class="health-card health-qr">
            <div class="health-value">{{ healthData.scan_qr }}</div>
            <div class="health-label">Scan QR</div>
          </div>
          <div class="health-card health-stopped">
            <div class="health-value">{{ healthData.stopped }}</div>
            <div class="health-label">Stopped</div>
          </div>
        </div>
        <div v-else class="health-unavailable">
          Health data unavailable
        </div>
        <div v-if="healthData" class="health-footer">
          <span class="health-meta">
            Auto-restart: {{ healthData.autoRestartEnabled ? "Enabled" : "Disabled" }}
          </span>
          <span class="health-meta">
            Last check: {{ formatTimestamp(healthData.lastCheck) }}
          </span>
          <button class="btn-link" @click="loadHealth">Refresh</button>
        </div>
      </div>

      <!-- Session Lifecycle -->
      <div class="settings-section card">
        <div class="section-title">
          <span class="section-icon">🔄</span>
          Session Lifecycle
        </div>
        <div class="settings-list">
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">Auto-restart on boot</div>
              <div class="settings-desc">
                When WAHA starts, automatically restart all sessions that were
                previously running. Disable this if you want to start sessions
                manually after a server restart.
              </div>
            </div>
            <label class="toggle-switch">
              <input v-model="sessionLc.autoRestartOnBoot" type="checkbox" aria-label="Auto-restart on boot" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">Auto-restart failed sessions</div>
              <div class="settings-desc">
                When a session enters the FAILED state, automatically attempt
                to restart it. Checked every 60 seconds. No server restart
                needed to apply changes.
              </div>
            </div>
            <label class="toggle-switch">
              <input v-model="sessionLc.autoRestartFailed" type="checkbox" aria-label="Auto-restart failed sessions" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">Restart all sessions</div>
              <div class="settings-desc">
                When enabled, restart commands apply to every session regardless
                of worker assignment. Useful for single-worker setups. In
                multi-worker deployments, leave this off so each worker only
                manages its own sessions.
              </div>
            </div>
            <label class="toggle-switch">
              <input v-model="sessionLc.restartAllSessions" type="checkbox" aria-label="Restart all sessions" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">Auto-start delay (seconds)</div>
              <div class="settings-desc">
                Wait time in seconds before auto-starting sessions on boot.
                Set to 0 for immediate startup. Increase if your server needs
                time to initialize dependencies (e.g. database, Redis).
              </div>
            </div>
            <input
              v-model.number="sessionLc.autoStartDelay"
              type="number"
              min="0"
              max="300"
              class="settings-number"
              aria-label="Auto-start delay in seconds"
            />
          </div>
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">Default engine</div>
              <div class="settings-desc">
                The WhatsApp engine used when creating sessions without
                specifying one explicitly. "Auto" picks the recommended engine
                for your setup. Each engine has different trade-offs in terms of
                speed, reliability, and feature support.
              </div>
            </div>
            <select v-model="settings.defaultEngine" class="settings-select">
              <option value="">Auto (recommended)</option>
              <option v-for="eng in engines" :key="eng" :value="eng">
                {{ eng }}
              </option>
            </select>
          </div>
        </div>
        <div class="settings-actions">
          <button class="btn-primary" :disabled="saving" @click="saveSettings">
            {{ saving ? "Saving..." : "Save Settings" }}
          </button>
        </div>
      </div>

      <!-- Dashboard Security -->
      <div class="settings-section card">
        <div class="section-title">
          <span class="section-icon">🔒</span>
          Dashboard Security
        </div>
        <div class="settings-list">
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">Current username</div>
              <div class="settings-desc">
                {{ dashboardSettings.username || "Not set" }}
                <span v-if="dashboardSettings.source" class="badge badge-working">
                  {{ dashboardSettings.source }}
                </span>
              </div>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">Change credentials</div>
              <div class="settings-desc">
                Update the dashboard login username and password. Credentials
                stored in the database take priority over environment variables.
              </div>
            </div>
            <button class="btn-secondary" @click="showCredentials = true">
              Change
            </button>
          </div>
        </div>
      </div>

      <!-- API Configuration -->
      <div class="settings-section card">
        <div class="section-title">
          <span class="section-icon">🔑</span>
          API Configuration
        </div>
        <div class="settings-list">
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">API Key</div>
              <div class="settings-desc">
                Used to authenticate REST API requests via the
                <code>X-Api-Key</code> header. Configure via the
                <code>WAHA_API_KEY</code> environment variable.
              </div>
            </div>
            <div class="api-key-display">
              <code class="mono">{{ apiKeyMasked }}</code>
            </div>
          </div>
        </div>
      </div>

      <!-- Workers -->
      <div class="settings-section card">
        <div class="section-title">
          <span class="section-icon">⚙</span>
          Workers
        </div>
        <div class="settings-list">
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">Worker ID</div>
              <div class="settings-desc mono">
                {{ serverStatus?.worker?.id ?? "default" }}
              </div>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">Uptime</div>
              <div class="settings-desc mono">{{ uptimeFormatted }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- About -->
      <div class="settings-section card">
        <div class="section-title">
          <span class="section-icon">ℹ</span>
          About
        </div>
        <div class="settings-list">
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">Version</div>
              <div class="settings-desc mono">
                {{ serverStatus?.version ?? "—" }}
              </div>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-info">
              <div class="settings-label">Edition</div>
              <div class="settings-desc">
                <span class="badge badge-working">Core</span>
                or
                <span class="badge badge-working">Plus</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Change Credentials Modal -->
    <div
      v-if="showCredentials"
      class="modal-overlay"
      @click.self="showCredentials = false"
    >
      <div class="modal-box">
        <div class="modal-title">Change Credentials</div>
        <form @submit.prevent="saveCredentials">
          <div class="form-group">
            <label class="form-label" for="cred-current">Current Password</label>
            <input
              id="cred-current"
              v-model="credForm.currentPassword"
              type="password"
              class="form-input"
              placeholder="Enter current password"
              autocomplete="current-password"
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="cred-username">New Username</label>
            <input
              id="cred-username"
              v-model="credForm.newUsername"
              type="text"
              class="form-input"
              placeholder="Enter new username"
              autocomplete="username"
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="cred-password">New Password</label>
            <input
              id="cred-password"
              v-model="credForm.newPassword"
              type="password"
              class="form-input"
              placeholder="At least 6 characters"
              autocomplete="new-password"
            />
          </div>
          <div class="modal-actions">
            <button
              type="button"
              class="btn-secondary"
              @click="showCredentials = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="credSaving"
            >
              {{ credSaving ? "Saving..." : "Save" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

interface ServerStatus {
  startTimestamp: number;
  uptime: number;
  worker: { id: string | null };
  version?: string;
}

interface DashboardSettings {
  username: string;
  source: string;
}

interface SessionLcSettings {
  autoRestartOnBoot: boolean;
  autoRestartFailed: boolean;
  restartAllSessions: boolean;
  autoStartDelay: number;
}

interface SessionHealthSummary {
  total: number;
  working: number;
  failed: number;
  scan_qr: number;
  stopped: number;
  lastCheck: string;
  autoRestartEnabled: boolean;
}

const { get, put } = useWahaApi();
const { success, error } = useToast();

const engines = ref<string[]>([]);
const saving = ref(false);
const serverStatus = ref<ServerStatus | null>(null);
const dashboardSettings = ref<DashboardSettings>({ username: "", source: "" });

const showCredentials = ref(false);
const credSaving = ref(false);

const healthData = ref<SessionHealthSummary | null>(null);
const healthLoading = ref(true);

// Session lifecycle settings from API (persisted to DB)
const sessionLc = reactive<SessionLcSettings>({
  autoRestartOnBoot: true,
  autoRestartFailed: false,
  restartAllSessions: false,
  autoStartDelay: 0,
});

// Local UI preferences (not persisted to server)
const settings = reactive({
  defaultEngine: "",
});

const credForm = reactive({
  currentPassword: "",
  newUsername: "",
  newPassword: "",
});

const uptimeFormatted = computed(() => {
  const ms = serverStatus.value?.uptime ?? 0;
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
});

const apiKeyMasked = computed(() => {
  const key = "";
  if (!key) return "Not configured";
  if (key.length <= 4) return "****";
  return "****" + key.slice(-4);
});

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

async function loadHealth() {
  healthLoading.value = true;
  try {
    healthData.value = await get<SessionHealthSummary>("/api/health/sessions");
  } catch {
    healthData.value = null;
  } finally {
    healthLoading.value = false;
  }
}

async function load() {
  try {
    const [status, dashSettings, engList, lcSettings] =
      await Promise.allSettled([
        get<ServerStatus>("/api/server/status"),
        get<DashboardSettings>("/api/dashboard/settings"),
        get<{ name: string }[]>("/api/engines"),
        get<SessionLcSettings>("/api/settings/sessions"),
      ]);

    if (status.status === "fulfilled") {
      serverStatus.value = status.value;
    }
    if (dashSettings.status === "fulfilled") {
      dashboardSettings.value = dashSettings.value;
    }
    if (engList.status === "fulfilled") {
      engines.value = engList.value.map((e) => e.name);
    }
    if (lcSettings.status === "fulfilled") {
      sessionLc.autoRestartOnBoot = lcSettings.value.autoRestartOnBoot;
      sessionLc.autoRestartFailed = lcSettings.value.autoRestartFailed;
      sessionLc.restartAllSessions = lcSettings.value.restartAllSessions;
      sessionLc.autoStartDelay = lcSettings.value.autoStartDelay;
    }
  } catch (err) {
    error("Failed to load settings: " + extractApiError(err));
  }
}

async function saveSettings() {
  saving.value = true;
  try {
    await put("/api/settings/sessions", {
      autoRestartOnBoot: sessionLc.autoRestartOnBoot,
      autoRestartFailed: sessionLc.autoRestartFailed,
      restartAllSessions: sessionLc.restartAllSessions,
      autoStartDelay: sessionLc.autoStartDelay,
    });
    success("Settings saved");
  } catch (e) {
    error("Failed to save settings: " + extractApiError(e));
  } finally {
    saving.value = false;
  }
}

async function saveCredentials() {
  if (
    !credForm.currentPassword ||
    !credForm.newUsername ||
    !credForm.newPassword
  ) {
    error("All fields are required");
    return;
  }
  if (credForm.newPassword.length < 6) {
    error("Password must be at least 6 characters");
    return;
  }
  credSaving.value = true;
  try {
    await put("/api/dashboard/settings/credentials", {
      currentPassword: credForm.currentPassword,
      newUsername: credForm.newUsername,
      newPassword: credForm.newPassword,
    });
    success("Credentials updated successfully!");
    showCredentials.value = false;
    credForm.currentPassword = "";
    credForm.newUsername = "";
    credForm.newPassword = "";
  } catch (err: unknown) {
    const msg =
      (err as { data?: { message?: string } })?.data?.message ??
      "Failed to update credentials";
    error(msg);
  } finally {
    credSaving.value = false;
  }
}

onMounted(() => {
  load();
  loadHealth();
});
</script>

<style scoped>
.settings-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 720px;
}

.settings-section {
  padding: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 16px;
}

.section-icon {
  font-size: 16px;
  line-height: 1;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.settings-row:last-child {
  border-bottom: none;
}

.settings-info {
  flex: 1;
  min-width: 0;
}

.settings-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
}

.settings-desc {
  font-size: 12px;
  color: var(--text-dim);
  line-height: 1.5;
}

.settings-desc.mono {
  font-family: var(--font-mono, monospace);
}

.settings-desc code {
  background: var(--surface);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  font-family: var(--font-mono, monospace);
}

.settings-select {
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  min-width: 160px;
}

.settings-select:focus {
  outline: none;
  border-color: var(--accent);
}

.settings-number {
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  min-width: 80px;
  text-align: center;
}

.settings-number:focus {
  outline: none;
  border-color: var(--accent);
}

.settings-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

/* Toggle switch */

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--border);
  border-radius: 24px;
  transition: background 0.2s ease;
}

.toggle-slider::before {
  content: "";
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--accent);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.toggle-switch input:focus-visible + .toggle-slider {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Badge */

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 600;
}

.badge-working {
  background: rgba(34, 197, 94, 0.15);
  color: var(--accent);
}

/* Session Health grid */

.health-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.health-card {
  text-align: center;
  padding: 12px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
}

.health-value {
  font-size: 22px;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  line-height: 1.2;
}

.health-label {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.health-total .health-value {
  color: var(--text);
}

.health-working .health-value {
  color: var(--accent);
}

.health-failed .health-value {
  color: #ef4444;
}

.health-qr .health-value {
  color: #f59e0b;
}

.health-stopped .health-value {
  color: var(--text-dim);
}

.health-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}

.health-meta {
  font-size: 12px;
  color: var(--text-dim);
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.btn-link:hover {
  opacity: 0.8;
}

.health-loading,
.health-unavailable {
  font-size: 13px;
  color: var(--text-dim);
  padding: 12px 0;
}

/* API Key display */

.api-key-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.api-key-display code {
  font-size: 13px;
  padding: 4px 10px;
  background: var(--surface);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

/* Modal improvements */

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions button {
  flex: 1;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-input::placeholder {
  color: var(--text-dim);
  opacity: 0.6;
}

/* Responsive */

@media (max-width: 640px) {
  .health-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .settings-section {
    padding: 16px;
  }

  .settings-row {
    gap: 10px;
  }

  .health-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
