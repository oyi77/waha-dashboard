<template>
  <div class="page-wrapper">
    <div class="page-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px">
      <div>
        <div class="page-title">⛭ Workers</div>
        <div class="page-subtitle">WAHA worker process management</div>
      </div>
      <button class="btn-ghost" @click="load">⟳ Refresh</button>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⟳</div>
      <div class="empty-state-text">Loading workers…</div>
    </div>

    <template v-else>
      <!-- Stat cards -->
      <div class="grid-4 stagger" style="margin-bottom: 24px">
        <div class="stat-card card">
          <div class="stat-label">Total Sessions</div>
          <div class="stat-value">{{ sessions.length }}</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">Working</div>
          <div class="stat-value stat-working">{{ workingCount }}</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">Failed</div>
          <div class="stat-value stat-failed">{{ failedCount }}</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">Stopped</div>
          <div class="stat-value stat-stopped">{{ stoppedCount }}</div>
        </div>
      </div>

      <!-- Worker info + sessions -->
      <div class="grid-2 stagger">
        <!-- Worker card -->
        <div class="card worker-card">
          <div class="card-header">
            <div class="worker-name">{{ workerLabel }}</div>
            <span class="badge badge-working"><span class="badge-dot" />RUNNING</span>
          </div>
          <div class="worker-meta">
            <div class="detail-row">
              <span class="detail-key">Uptime</span>
              <span class="detail-val">{{ uptimeFormatted }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-key">Worker ID</span>
              <span class="detail-val">{{ serverStatus?.worker?.id ?? 'default' }}</span>
            </div>
          </div>
          <div class="engine-breakdown" v-if="Object.keys(engineCounts).length > 0">
            <div class="section-title">Engine Distribution</div>
            <div class="engine-bars">
              <div v-for="(count, eng) in engineCounts" :key="eng" class="engine-bar-row">
                <span class="engine-label" :class="`engine-${String(eng).toLowerCase()}`">{{ eng }}</span>
                <div class="engine-bar-track">
                  <div class="engine-bar-fill" :class="`engine-${String(eng).toLowerCase()}-bg`" :style="{ width: `${(count / sessions.length) * 100}%` }"></div>
                </div>
                <span class="engine-count">{{ count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sessions list -->
        <div class="card">
          <div class="card-header">
            <div class="section-title">Sessions</div>
            <span class="badge">{{ sessions.length }}</span>
          </div>
          <div v-if="sessions.length > 0" class="session-list">
            <div
              v-for="session in sessions"
              :key="session.name"
              class="session-row"
              role="button"
              tabindex="0"
              @click="openSessionDetail(session)"
              @keydown.enter="openSessionDetail(session)"
            >
              <div class="session-info">
                <span class="session-name">{{ session.name }}</span>
                <span v-if="session.me?.pushName" class="session-push-name">{{ session.me.pushName }}</span>
              </div>
              <div class="session-badges">
                <span v-if="session.engine" class="badge" :class="resolveEngine(session.engine) ? `engine-${resolveEngine(session.engine).toLowerCase()}` : ''">
                  {{ resolveEngine(session.engine) || session.engine }}
                </span>
                <span class="badge" :class="sessionStatusClass(session.status)">
                  <span class="badge-dot" />{{ session.status }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="empty-sessions">No sessions found</div>
        </div>
      </div>
    </template>

    <!-- Session Detail Modal -->
    <div
      v-if="selectedSession"
      class="modal-overlay"
      @click.self="closeSessionDetail"
      @keydown.escape="closeSessionDetail"
      ref="modalOverlay"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-box">
        <div class="modal-title" style="display: flex; justify-content: space-between; align-items: center">
          <span>Session: <span style="font-family: var(--font-mono)">{{ selectedSession.name }}</span></span>
          <button class="btn-ghost" aria-label="Close session detail" @click="closeSessionDetail" style="padding: 4px 8px">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px">
          <div class="detail-row">
            <span class="detail-key">Status</span>
            <span class="badge" :class="sessionStatusClass(selectedSession.status)">
              <span class="badge-dot" />{{ selectedSession.status }}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-key">Engine</span>
            <span v-if="resolveEngine(selectedSession.engine)" class="badge" :class="`engine-${resolveEngine(selectedSession.engine).toLowerCase()}`">
              {{ resolveEngine(selectedSession.engine) }}
            </span>
            <span v-else class="detail-val">Unknown</span>
          </div>
          <div class="detail-row" v-if="selectedSession.me?.pushName">
            <span class="detail-key">Name</span>
            <span class="detail-val">{{ selectedSession.me.pushName }}</span>
          </div>
          <div class="detail-row" v-if="selectedSession.me?.id">
            <span class="detail-key">Phone</span>
            <span class="detail-val">{{ selectedSession.me.id.split("@")[0] }}</span>
          </div>
        </div>

        <div class="section-title">Switch Engine</div>
        <div style="display: flex; gap: 10px">
          <select v-model="engineToSwitch" style="flex: 2">
            <option value="NOWEB">NOWEB</option>
            <option value="WEBJS">WEBJS</option>
            <option value="WPP">WPP</option>
            <option value="GOWS">GOWS</option>
          </select>
          <button
            class="btn-primary"
            style="flex: 1"
            @click="switchEngine"
            :disabled="isSwitching || !engineToSwitch || engineToSwitch === selectedSession.engine"
          >
            {{ isSwitching ? "Switching..." : "Switch" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

interface SessionMe {
  id: string;
  pushName?: string;
}

interface SessionInfo {
  name: string;
  status: string;
  engine?: string | Record<string, unknown>;
  me?: SessionMe | null;
}

function resolveEngine(engine: string | Record<string, unknown> | undefined): string {
  if (typeof engine === "string" && engine.length > 0) return engine;
  return "";
}

interface ServerStatus {
  startTimestamp: number;
  uptime: number;
  worker: { id: string | null };
}

const { get, post } = useWahaApi();
const { error, success } = useToast();

const loading = ref(true);
const serverStatus = ref<ServerStatus | null>(null);
const sessions = ref<SessionInfo[]>([]);

const selectedSession = ref<SessionInfo | null>(null);
const engineToSwitch = ref<string>("");
const isSwitching = ref(false);
const modalOverlay = ref<HTMLElement | null>(null);

function trapFocus(e: KeyboardEvent) {
  if (!modalOverlay.value || e.key !== "Tab") return;
  const focusable = modalOverlay.value.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

watch(selectedSession, (val) => {
  if (val) {
    document.addEventListener("keydown", trapFocus);
    nextTick(() => { modalOverlay.value?.querySelector<HTMLElement>("[autofocus], button")?.focus(); });
  } else {
    document.removeEventListener("keydown", trapFocus);
  }
});

const workerLabel = computed(() => serverStatus.value?.worker?.id ?? "default");

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

const workingCount = computed(() => sessions.value.filter(s => s.status === "WORKING").length);
const failedCount = computed(() => sessions.value.filter(s => s.status === "FAILED").length);
const stoppedCount = computed(() => sessions.value.filter(s => s.status === "STOPPED" || s.status === "SCAN_QR_CODE").length);

const engineCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {};
  for (const s of sessions.value) {
    const eng = resolveEngine(s.engine);
    if (eng) counts[eng] = (counts[eng] || 0) + 1;
  }
  return counts;
});

function sessionStatusClass(status: string): string {
  const s = (status ?? "").toUpperCase();
  if (s === "WORKING" || s === "ONLINE" || s === "RUNNING") return "badge-working";
  if (s === "STARTING") return "badge-starting";
  if (s === "SCAN_QR_CODE") return "badge-scan";
  if (s === "STOPPED" || s === "OFFLINE") return "badge-stopped";
  if (s === "FAILED" || s === "ERROR") return "badge-failed";
  return "badge-stopped";
}

async function load(): Promise<void> {
  try {
    const [status, sessionList] = await Promise.all([
      get<ServerStatus>("/api/server/status"),
      get<SessionInfo[]>("/api/sessions?all=true"),
    ]);
    serverStatus.value = status;
    const list = Array.isArray(sessionList) ? sessionList : [];
    const detailsResults = await Promise.allSettled(
      list.map((s) => get<SessionInfo>(`/api/sessions/${s.name}`)),
    );
    const detailedSessions: SessionInfo[] = [];
    for (let i = 0; i < list.length; i++) {
      const res = detailsResults[i];
      if (res.status === "fulfilled" && res.value) {
        detailedSessions.push(res.value);
      } else {
        detailedSessions.push(list[i]);
      }
    }
    sessions.value = detailedSessions;
    if (selectedSession.value) {
      const updated = detailedSessions.find(s => s.name === selectedSession.value?.name);
      if (updated) { selectedSession.value = updated; } else { selectedSession.value = null; }
    }
  } catch (err: unknown) {
    error("Failed to load worker info: " + extractApiError(err));
  } finally {
    loading.value = false;
  }
}

function openSessionDetail(session: SessionInfo) {
  selectedSession.value = session;
  engineToSwitch.value = resolveEngine(session.engine);
}

function closeSessionDetail() {
  selectedSession.value = null;
  engineToSwitch.value = "";
}

async function switchEngine() {
  const newEngine = engineToSwitch.value;
  const name = selectedSession.value?.name;
  if (!newEngine || !name || newEngine === resolveEngine(selectedSession.value?.engine)) return;
  isSwitching.value = true;
  try {
    await post(`/api/sessions/${name}/switch-engine`, { engine: newEngine });
    success(`Successfully switched engine for ${name}`);
    await load();
  } catch (err: unknown) {
    error("Failed to switch engine: " + extractApiError(err));
  } finally {
    isSwitching.value = false;
    closeSessionDetail();
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
function startPolling() { pollTimer = setInterval(load, 15000); }
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

onMounted(async () => {
  await load();
  startPolling();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stopPolling(); } else { load(); startPolling(); }
  });
});
onUnmounted(() => { stopPolling(); });
</script>

<style scoped>
.stat-card {
  text-align: center;
  padding: 20px 16px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  color: var(--text);
}

.stat-working { color: var(--accent); }
.stat-failed { color: #ef4444; }
.stat-stopped { color: var(--text-dim); }

.worker-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.worker-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.worker-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  align-items: center;
}

.detail-key {
  color: var(--text-dim);
}

.detail-val {
  color: var(--text-muted);
  font-family: var(--font-mono, monospace);
  word-break: break-all;
  max-width: 60%;
  text-align: right;
}

.engine-breakdown {
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

.engine-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.engine-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.engine-label {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono, monospace);
  min-width: 50px;
}

.engine-bar-track {
  flex: 1;
  height: 8px;
  background: var(--surface);
  border-radius: 4px;
  overflow: hidden;
}

.engine-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.engine-noweb .engine-label { color: #22c55e; }
.engine-noweb-bg { background: #22c55e; }
.engine-webjs .engine-label { color: #3b82f6; }
.engine-webjs-bg { background: #3b82f6; }
.engine-wpp .engine-label { color: #a855f7; }
.engine-wpp-bg { background: #a855f7; }
.engine-gows .engine-label { color: #f97316; }
.engine-gows-bg { background: #f97316; }

.engine-count {
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-mono, monospace);
  color: var(--text-muted);
  min-width: 24px;
  text-align: right;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 400px;
  overflow-y: auto;
}

.session-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.session-row:hover,
.session-row:focus-visible {
  background: var(--surface-hover);
}

.session-row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.session-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  font-family: var(--font-mono, monospace);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-push-name {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-badges {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
  margin-right: 6px;
}

.empty-sessions {
  font-size: 13px;
  color: var(--text-dim);
  font-style: italic;
  padding: 20px 0;
  text-align: center;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 900px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
