<template>
  <div class="page-wrapper">
    <div
      class="page-header"
      style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
      "
    >
      <div>
        <div class="page-title">◎ Sessions</div>
        <div class="page-subtitle">WhatsApp session management</div>
      </div>
       <div
         style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap"
       >
         <button class="btn-ghost" @click="loadSessions">{{ t("action.refresh") }}</button>
         <button
           class="btn-secondary"
           :disabled="failedCount === 0"
           @click="recoverAll"
          :title="t('tooltip.recoverFailed')"
         >
           {{ t("action.recoverFailed") }} ({{ failedCount }})
         </button>
         <button
           class="btn-secondary"
           :disabled="stoppedCount === 0"
           @click="startAllStopped"
         >
           {{ t("action.startAll") }} ({{ stoppedCount }})
         </button>
         <button
           class="btn-ghost"
           :disabled="workingCount === 0"
           @click="stopAllWorking"
         >
           {{ t("action.stopAll") }} ({{ workingCount }})
         </button>
         <button class="btn-primary" @click="showCreate = true">
           {{ t("action.newSession") }}
         </button>
       </div>
    </div>

    <!-- Stat Cards -->
    <div class="grid-5 stagger" style="margin-bottom: 24px">
      <div class="stat-card card">
        <div class="stat-label">{{ t("stat.total") }}</div>
        <div class="stat-value">{{ sessions.length }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">{{ t("stat.working") }}</div>
        <div class="stat-value stat-working">{{ workingCount }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">{{ t("stat.failed") }}</div>
        <div class="stat-value stat-failed">{{ failedCount }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">{{ t("stat.stopped") }}</div>
        <div class="stat-value stat-stopped">{{ stoppedCount }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">{{ t("stat.scanQr") }}</div>
        <div class="stat-value stat-scan">{{ scanQrCount }}</div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{
            active: filterStatus === tab.value,
            [`filter-${tab.value.toLowerCase().replace('_', '-')}`]: true,
          }"
          @click="filterStatus = tab.value"
        >
          <span class="filter-tab-dot" :class="`dot-${tab.value.toLowerCase().replace('_', '-')}`" />
          {{ t(tab.key) }}
          <span class="filter-count">{{ tabCount(tab.value) }}</span>
        </button>
      </div>
      <input
        v-model="searchQuery"
        class="filter-search"
        :placeholder="t('filter.searchPlaceholder')"
        type="search"
      />
    </div>

    <!-- Bulk Action Bar -->
    <div v-if="selected.size > 0" class="bulk-bar">
      <span class="bulk-label">{{ selected.size }} selected</span>
      <button class="btn-secondary" @click="bulkStart">{{ t("action.start") }}</button>
      <button class="btn-ghost" @click="bulkStop">{{ t("action.stop") }}</button>
      <button class="btn-danger" @click="bulkDelete">{{ t("action.delete") }}</button>
      <button
        class="btn-ghost"
        style="margin-left: auto"
        @click="selected.clear()"
      >
        ✕ Clear
      </button>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⟳</div>
      <div class="empty-state-text">Loading sessions...</div>
    </div>

    <div v-else-if="filteredSessions.length === 0" class="empty-state">
      <div class="empty-state-icon">{{ emptyIcon }}</div>
      <div class="empty-state-text">{{ emptyText }}</div>
      <button
        v-if="sessions.length === 0"
        class="btn-primary"
        style="margin-top: 16px"
        @click="showCreate = true"
      >
        + Create First Session
      </button>
    </div>

    <div v-else class="sessions-grid stagger">
      <div
        v-for="session in filteredSessions"
        :key="session.name"
        class="session-card card"
        :class="{
          selected: selected.has(session.name),
          [`status-${session.status.toLowerCase().replace('_', '-')}`]: true,
        }"
      >
        <!-- Card Header -->
        <div class="session-card-header">
          <label class="session-checkbox" @click.stop>
            <input
              type="checkbox"
              :aria-label="t('tooltip.selectSession', { name: session.name })"
              :checked="selected.has(session.name)"
              @change="toggleSelect(session.name)"
            />
          </label>
          <div class="session-info">
            <div class="session-name">{{ session.name }}</div>
            <div v-if="session.me?.pushName" class="session-phone">
              {{ session.me.pushName }}
              <span class="text-dim"> · +{{ session.me.id?.replace("@s.whatsapp.net", "") }}</span>
            </div>
          </div>
          <span class="badge" :class="statusClass(session.status)">
            <span class="badge-dot" />{{ session.status }}
          </span>
        </div>

        <!-- Engine + Tags Row -->
        <div class="session-meta-row">
          <span
            class="badge"
            :class="`engine-${(session.engine || 'noweb').toLowerCase()}`"
          >
            {{ session.engine || "NOWEB" }}
          </span>
          <div v-if="getTags(session).length > 0" class="session-tags">
            <span
              v-for="tag in getTags(session)"
              :key="tag"
              class="tag-pill"
              :class="{ active: filterTag === tag }"
              @click="toggleTagFilter(tag)"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="session-actions">
          <button
            v-if="session.status === 'FAILED'"
            class="action-btn action-restart"
            :title="t('tooltip.restart')"
            :aria-label="t('tooltip.restart')"
            @click="confirmStart(session.name)"
          >
            {{ t("action.restart") }}
          </button>
          <button
            v-if="session.status === 'STOPPED'"
            class="action-btn action-start"
            :title="t('tooltip.start')"
            :aria-label="t('tooltip.start')"
            @click="confirmStart(session.name)"
          >
            {{ t("action.start") }}
          </button>
          <button
            v-if="session.status === 'WORKING'"
            class="action-btn action-restart"
            :title="t('tooltip.restart')"
            :aria-label="t('tooltip.restart')"
            @click="confirmRestart(session.name)"
          >
            {{ t("action.restart") }}
          </button>
          <button
            v-if="session.status === 'WORKING'"
            class="action-btn action-settings"
            :title="t('tooltip.timelockQuota')"
            :aria-label="t('tooltip.accountStatus')"
            @click="openAccountStatus(session.name)"
          >
            {{ t("action.accountStatus") }}
          </button>
          <button
            v-if="session.status === 'SCAN_QR_CODE'"
            class="action-btn action-qr"
            :title="t('tooltip.scanQr')"
            :aria-label="t('tooltip.scanQr')"
            @click="openQr(session.name)"
          >
            {{ t("action.scanQr") }}
          </button>
          <button
            class="action-btn action-settings"
            :title="t('tooltip.settings')"
            :aria-label="t('tooltip.settings')"
            @click="editSession(session)"
          >
            {{ t("action.settings") }}
          </button>
          <button
            class="action-btn action-delete"
            :title="t('tooltip.delete')"
            :aria-label="t('tooltip.delete')"
            @click="confirmDelete(session.name)"
          >
            {{ t("action.delete") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create / Edit Session Modal -->
    <div
      v-if="showCreate || editTarget !== null"
      class="modal-overlay"
      @click.self="closeModal"
      @keydown.escape="closeModal"
    >
      <div class="modal-box" tabindex="-1">
        <div class="modal-title">
          {{ editTarget !== null ? "Edit Session" : "Create Session" }}
        </div>
        <div class="form-group">
          <label class="form-label">Session Name</label>
          <input
            v-model="form.name"
            :placeholder="editTarget !== null ? '' : 'default'"
            :disabled="editTarget !== null"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Engine</label>
          <select v-model="form.engine">
            <option value="">Auto</option>
            <option v-for="eng in engines" :key="eng" :value="eng">
              {{ eng }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tags (comma-separated)</label>
          <input v-model="form.tags" placeholder="sales, support, bots" />
        </div>
        <div v-if="editTarget === null" class="form-group">
          <label class="form-label">Start on create</label>
          <label class="toggle-switch">
            <input v-model="form.start" type="checkbox" />
            <span class="toggle-slider" />
          </label>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px">
          <button class="btn-secondary" style="flex: 1" @click="closeModal">
            Cancel
          </button>
          <button
            class="btn-primary"
            style="flex: 1"
            @click="editTarget !== null ? saveEdit() : createSession()"
          >
            {{ editTarget !== null ? "Save" : "Create" }}
          </button>
        </div>
      </div>
    </div>

    <!-- QR Modal -->
    <div v-if="qrSession" class="modal-overlay" @click.self="qrSession = ''" @keydown.escape="qrSession = ''">
      <div class="modal-box" style="text-align: center">
        <div class="modal-title">Scan QR Code — {{ qrSession }}</div>
        <div
          v-if="qrData === 'pending'"
          class="empty-state-text"
          style="padding: 40px 0"
        >
          Waiting for session to be ready...
        </div>
        <div
          v-else-if="qrData === 'timeout'"
          class="empty-state-text"
          style="padding: 40px 0; color: #f59e0b"
        >
          Session did not enter QR state in time.<br />Please try again.
        </div>
        <div v-else-if="qrData" style="margin: 20px auto">
          <img
            :src="qrData"
            alt="QR Code"
            style="max-width: 260px; border-radius: 8px"
          />
        </div>
        <div v-else class="empty-state-text" style="padding: 40px 0">
          Loading QR...
        </div>
        <button
          class="btn-ghost"
          style="margin-top: 12px"
          @click="qrSession = ''"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Account Status Modal (timelock + message capping) -->
    <div
      v-if="statusTarget"
      class="modal-overlay"
      @click.self="statusTarget = ''"
      @keydown.escape="statusTarget = ''"
    >
      <div class="modal-box" tabindex="-1">
        <div class="modal-title">{{ t("acct.title") }} — {{ statusTarget }}</div>
        <div v-if="statusLoading" class="empty-state-text" style="padding: 24px 0">
          ⟳ Loading...
        </div>
        <template v-else>
          <div class="status-section">
            <div class="status-section-title">{{ t("acct.timelock") }}</div>
            <div v-if="statusTimelock" class="status-rows">
              <div class="status-row">
                <span>{{ t("acct.restriction") }}</span>
                <span
                  class="badge"
                  :class="statusTimelock.isActive ? 'badge-failed' : 'badge-working'"
                >
                  {{ statusTimelock.isActive ? t("acct.active") : t("acct.clear") }}
                </span>
              </div>
              <div class="status-row">
                <span>{{ t("acct.type") }}</span>
                <code>{{ statusTimelock.enforcementType }}</code>
              </div>
              <div v-if="statusTimelock.timeEnforcementEnds" class="status-row">
                <span>{{ t("acct.endsAt") }}</span>
                <code>{{ formatTime(statusTimelock.timeEnforcementEnds) }}</code>
              </div>
            </div>
            <div v-else class="status-empty">{{ t("acct.none") }}</div>
          </div>
          <div class="status-section">
            <div class="status-section-title">{{ t("acct.quota") }}</div>
            <div v-if="statusCapping && statusCapping.cappingStatus !== 'NONE'" class="status-rows">
              <div class="status-row">
                <span>{{ t("acct.quotaStatus") }}</span>
                <span
                  class="badge"
                  :class="cappingBadgeClass(statusCapping.cappingStatus)"
                >{{ statusCapping.cappingStatus }}</span>
              </div>
              <div class="status-row">
                <span>{{ t("acct.usage") }}</span>
                <code>{{ statusCapping.usedQuota }} / {{ statusCapping.totalQuota }}</code>
              </div>
              <div class="quota-bar-wrap">
                <div class="quota-bar">
                  <div
                    class="quota-fill"
                    :style="{ width: quotaPercent + '%' }"
                    :class="{ 'quota-warn': quotaPercent >= 80 }"
                  />
                </div>
                <span class="quota-pct">{{ quotaPercent }}%</span>
              </div>
              <div class="status-row">
                <span>{{ t("acct.cycleEnds") }}</span>
                <code>{{ formatTime(statusCapping.cycleEnd) }}</code>
              </div>
            </div>
            <div v-else class="status-empty">{{ t("acct.noCapping") }}</div>
          </div>
        </template>
        <button
          class="btn-ghost"
          style="margin-top: 16px; width: 100%"
          @click="statusTarget = ''"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div
      v-if="confirmAction"
      class="modal-overlay"
      @click.self="confirmAction = null"
      @keydown.escape="confirmAction = null"
    >
      <div class="modal-box" tabindex="-1">
        <div class="modal-title">{{ confirmAction.title }}</div>
        <p
          style="color: var(--text-muted); font-size: 13px; margin-bottom: 24px"
        >
          {{ confirmAction.message }}
        </p>
        <div style="display: flex; gap: 10px">
          <button
            class="btn-ghost"
            style="flex: 1"
            @click="confirmAction = null"
          >
            Cancel
          </button>
          <button
            :class="confirmAction.danger ? 'btn-danger' : 'btn-primary'"
            style="flex: 1"
            @click="confirmAction.fn()"
          >
            {{ confirmAction.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">


interface Session {
  name: string;
  status: string;
  engine?: string;
  me?: { id?: string; pushName?: string };
  metadata?: Record<string, string>;
}

interface ConfirmAction {
  title: string;
  message: string;
  label: string;
  danger: boolean;
  fn: () => void;
}

const { get, post, put, del } = useWahaApi();
const { success, error } = useToast();
const { t } = useLocale();

const sessions = ref<Session[]>([]);
const engines = ref<string[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const qrSession = ref("");
const qrData = ref("");
const confirmAction = ref<ConfirmAction | null>(null);
const editTarget = ref<string | null>(null);
const selected = ref<Set<string>>(new Set());

// Account status modal (timelock + capping)
interface ReachoutTimelock {
  enforcementType: string;
  isActive: boolean;
  timeEnforcementEnds: number | null;
}
interface MessageCapping {
  cappingStatus: string;
  totalQuota: number;
  usedQuota: number;
  cycleStart: number;
  cycleEnd: number;
}
const statusTarget = ref("");
const statusLoading = ref(false);
const statusTimelock = ref<ReachoutTimelock | null>(null);
const statusCapping = ref<MessageCapping | null>(null);

// Filter state
const filterStatus = ref("ALL");
const searchQuery = ref("");
const filterTag = ref("");

const form = reactive({
  name: "",
  engine: "",
  tags: "",
  start: true,
});

const statusTabs = [
  { key: "filter.all", value: "ALL" },
  { key: "filter.working", value: "WORKING" },
  { key: "filter.starting", value: "STARTING" },
  { key: "filter.stopped", value: "STOPPED" },
  { key: "filter.scanQrCode", value: "SCAN_QR_CODE" },
  { key: "filter.failed", value: "FAILED" },
] as const;

const stoppedCount = computed(
  () => sessions.value.filter((s) => s.status === "STOPPED").length,
);
const workingCount = computed(
  () => sessions.value.filter((s) => s.status === "WORKING").length,
);
const failedCount = computed(
  () => sessions.value.filter((s) => s.status === "FAILED").length,
);
const scanQrCount = computed(
  () => sessions.value.filter((s) => s.status === "SCAN_QR_CODE").length,
);

const emptyIcon = computed(() => {
  if (sessions.value.length === 0) return "◎";
  const map: Record<string, string> = {
    ALL: "◎",
    WORKING: "●",
    STARTING: "◉",
    STOPPED: "○",
    SCAN_QR_CODE: "⊡",
    FAILED: "⊘",
  };
  return map[filterStatus.value] ?? "◎";
});

const emptyText = computed(() => {
  if (sessions.value.length === 0) {
    return t("empty.noSessions");
  }
  const map: Record<string, string> = {
    ALL: t("empty.noMatch"),
    WORKING: t("empty.noWorking"),
    STARTING: t("empty.noStarting"),
    STOPPED: t("empty.noStopped"),
    SCAN_QR_CODE: t("empty.noQr"),
    FAILED: t("empty.allClear"),
  };
  return map[filterStatus.value] ?? t("empty.noMatch");
});

const allTags = computed(() => {
  const tags = new Set<string>();
  for (const s of sessions.value) {
    for (const tag of getTags(s)) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
});

const filteredSessions = computed(() => {
  let list = applyLiveStatuses(sessions.value);

  if (filterStatus.value !== "ALL") {
    list = list.filter((s) => s.status === filterStatus.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((s) => s.name.toLowerCase().includes(q));
  }

  if (filterTag.value) {
    list = list.filter((s) => getTags(s).includes(filterTag.value));
  }

  return list;
});

function tabCount(status: string): number {
  if (status === "ALL") return sessions.value.length;
  return sessions.value.filter((s) => s.status === status).length;
}

function statusClass(status: string): string {
  const map: Record<string, string> = {
    WORKING: "badge-working",
    STARTING: "badge-starting",
    SCAN_QR_CODE: "badge-scan",
    STOPPED: "badge-stopped",
    FAILED: "badge-failed",
  };
  return map[status] ?? "badge-stopped";
}

function avatarLetter(name?: string): string {
  return (name?.[0] ?? "?").toUpperCase();
}

function getTags(session: Session): string[] {
  const tags = session.metadata?.tags;
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function toggleTagFilter(tag: string) {
  filterTag.value = filterTag.value === tag ? "" : tag;
}

// ---- Load ----
async function loadSessions() {
  loading.value = true;
  try {
    const data = await get<Session[]>("/api/sessions?all=true");
    sessions.value = data;
    // ✅ Cache sessions locally for offline resilience
    localStorage.setItem("waha_sessions_cache", JSON.stringify(data));
    localStorage.setItem("waha_sessions_cache_time", new Date().toISOString());
  } catch (e) {
    const errorMsg = extractApiError(e);
    // ✅ Fall back to cached data if API fails
    const cached = localStorage.getItem("waha_sessions_cache");
    if (cached) {
      try {
        sessions.value = JSON.parse(cached);
        const cacheTime = localStorage.getItem("waha_sessions_cache_time");
        const age = cacheTime ? Math.round((Date.now() - new Date(cacheTime).getTime()) / 1000) : 0;
        error(t("toast.cacheOffline", { age }));
      } catch {
        error(t("toast.loadSessionsFail") + errorMsg);
      }
    } else {
      error(t("toast.loadSessionsFail") + errorMsg);
    }
  } finally {
    loading.value = false;
  }
}

async function loadEngines() {
  try {
    const data = await get<{ name: string }[]>("/api/engines");
    engines.value = data.map((e) => e.name);
  } catch {}
}

// ---- Create ----
async function createSession() {
  try {
    const name = form.name.trim() || "default";
    const body: Record<string, unknown> = { name };
    if (form.engine) body.engine = form.engine;
    if (form.tags.trim()) {
      body.metadata = {
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .join(","),
      };
    }
    await post("/api/sessions", body);
    if (form.start) {
      await post(`/api/sessions/${name}/start`);
    }
    success(t("toast.created"));
    closeModal();
    await loadSessions();
  } catch (e) {
    error(t("toast.createFail") + extractApiError(e));
  }
}

// ---- Edit ----
function editSession(session: Session) {
  editTarget.value = session.name;
  form.name = session.name;
  form.engine = session.engine ?? "";
  form.tags = getTags(session).join(", ");
}

async function saveEdit() {
  if (!editTarget.value) return;
  try {
    const config: Record<string, unknown> = {};
    if (form.engine) config.engine = form.engine;
    config.metadata = {
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .join(","),
    };
    await put(`/api/sessions/${editTarget.value}`, { config });
    success(t("toast.updated"));
    closeModal();
    await loadSessions();
  } catch (e) {
    error(t("toast.updateFail") + extractApiError(e));
  }
}

// ---- Start / Stop ----
function confirmStart(name: string) {
  confirmAction.value = {
    title: t("confirm.startSession.title"),
    message: t("confirm.startSession.message", { name: name }),
    label: t("confirm.startSession.label"),
    danger: false,
    fn: async () => {
      confirmAction.value = null;
      try {
        await post(`/api/sessions/${name}/start`);
        success(t("toast.startedName", { name }));
        await loadSessions();
      } catch (e) {
        error(t("toast.startFail") + extractApiError(e));
      }
    },
  };
}

function confirmStop(name: string) {
  confirmAction.value = {
    title: t("confirm.stopSession.title"),
    message: t("confirm.stopSession.message", { name: name }),
    label: t("confirm.stopSession.label"),
    danger: true,
    fn: async () => {
      confirmAction.value = null;
      try {
        await post(`/api/sessions/${name}/stop`);
        success(t("toast.stoppedName", { name }));
        await loadSessions();
      } catch (e) {
        error(t("toast.stopFail") + extractApiError(e));
      }
    },
  };
}

// ---- Restart ----
function confirmRestart(name: string) {
  confirmAction.value = {
    title: t("confirm.restartSession.title"),
    message: t("confirm.restartSession.message", { name: name }),
    label: t("confirm.restartSession.label"),
    danger: false,
    fn: async () => {
      confirmAction.value = null;
      try {
        await post(`/api/sessions/${name}/restart`);
        success(t("toast.restartingName", { name }));
        await loadSessions();
      } catch (e) {
        error(t("toast.restartFail") + extractApiError(e));
      }
    },
  };
}

// ---- Delete ----
function confirmDelete(name: string) {
  confirmAction.value = {
    title: t("confirm.deleteSession.title"),
    message: t("confirm.deleteSession.message", { name: name }),
    label: t("confirm.deleteSession.label"),
    danger: true,
    fn: async () => {
      confirmAction.value = null;
      try {
        await del(`/api/sessions/${name}`);
        success(t("toast.deletedName", { name }));
        selected.value.delete(name);
        await loadSessions();
      } catch (e) {
        error(t("toast.deleteFail") + extractApiError(e));
      }
    },
  };
}

// ---- Bulk ----
function toggleSelect(name: string) {
  if (selected.value.has(name)) {
    selected.value.delete(name);
  } else {
    selected.value.add(name);
  }
}

async function bulkStart() {
  const names = Array.from(selected.value);
  confirmAction.value = {
    title: t("confirm.bulkStart.title"),
    message: t("confirm.bulkStart.message", { n: names.length }),
    label: t("confirm.bulkStart.label"),
    danger: false,
    fn: async () => {
      confirmAction.value = null;
      let ok = 0;
      let fail = 0;
      for (const name of names) {
        try {
          await post(`/api/sessions/${name}/start`);
          ok++;
        } catch (e) {
          fail++;
        }
      }
      selected.value.clear();
      if (fail > 0) error(t("toast.bulkStartFail", { n: fail }));
      success(t("toast.bulkStartOk", { n: ok }));
      await loadSessions();
    },
  };
}

async function bulkStop() {
  const names = Array.from(selected.value);
  confirmAction.value = {
    title: t("confirm.bulkStop.title"),
    message: t("confirm.bulkStop.message", { n: names.length }),
    label: t("confirm.bulkStop.label"),
    danger: true,
    fn: async () => {
      confirmAction.value = null;
      let ok = 0;
      let fail = 0;
      for (const name of names) {
        try {
          await post(`/api/sessions/${name}/stop`);
          ok++;
        } catch (e) {
          fail++;
        }
      }
      selected.value.clear();
      if (fail > 0) error(t("toast.bulkStopFail", { n: fail }));
      success(t("toast.bulkStopOk", { n: ok }));
      await loadSessions();
    },
  };
}

async function bulkDelete() {
  const names = Array.from(selected.value);
  confirmAction.value = {
    title: t("confirm.bulkDelete.title"),
    message: t("confirm.bulkDelete.message", { n: names.length }),
    label: t("confirm.bulkDelete.label"),
    danger: true,
    fn: async () => {
      confirmAction.value = null;
      let ok = 0;
      let fail = 0;
      for (const name of names) {
        try {
          await del(`/api/sessions/${name}`);
          ok++;
        } catch (e) {
          fail++;
        }
      }
      selected.value.clear();
      if (fail > 0) error(t("toast.bulkDeleteFail", { n: fail }));
      success(t("toast.bulkDeleteOk", { n: ok }));
      await loadSessions();
    },
  };
}

// ---- Start All / Stop All ----
async function startAllStopped() {
  const stopped = sessions.value.filter((s) => s.status === "STOPPED");
  if (stopped.length === 0) return;
  confirmAction.value = {
    title: t("confirm.startAllStopped.title"),
    message: t("confirm.startAllStopped.message", { n: stopped.length }),
    label: t("confirm.startAllStopped.label"),
    danger: false,
    fn: async () => {
      confirmAction.value = null;
      let ok = 0;
      let fail = 0;
      for (const s of stopped) {
        try {
          await post(`/api/sessions/${s.name}/start`);
          ok++;
        } catch (e) {
          fail++;
        }
      }
      if (fail > 0) error(t("toast.bulkStartFail", { n: fail }));
      success(t("toast.bulkStartOk", { n: ok }));
      await loadSessions();
    },
  };
}

async function stopAllWorking() {
  const working = sessions.value.filter((s) => s.status === "WORKING");
  if (working.length === 0) return;
  confirmAction.value = {
    title: t("confirm.stopAllWorking.title"),
    message: t("confirm.stopAllWorking.message", { n: working.length }),
    label: t("confirm.stopAllWorking.label"),
    danger: true,
    fn: async () => {
      confirmAction.value = null;
      let ok = 0;
      let fail = 0;
      for (const s of working) {
        try {
          await post(`/api/sessions/${s.name}/stop`);
          ok++;
        } catch (e) {
          fail++;
        }
      }
      if (fail > 0) error(t("toast.bulkStopFail", { n: fail }));
      success(t("toast.bulkStopOk", { n: ok }));
      await loadSessions();
    },
  };
}

// ---- QR ----
async function openQr(name: string) {
  qrSession.value = name;
  qrData.value = "";
  try {
    // If session is not in SCAN_QR_CODE, it may still be starting up.
    // Poll until it's ready (max 30s)
    const session = sessions.value.find((s) => s.name === name);
    if (session && session.status !== "SCAN_QR_CODE") {
      qrData.value = "pending"; // signals "waiting for session to be ready"
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const updated = sessions.value.find((s) => s.name === name);
        if (updated?.status === "SCAN_QR_CODE") {
          break;
        }
        if (updated?.status === "WORKING" || updated?.status === "FAILED") {
          qrData.value = "";
          error(t("qr.statusChanged"));
          return;
        }
      }
      if (qrData.value === "pending") {
        qrData.value = "timeout";
        error(t("qr.timeout"));
        return;
      }
    }

    const data = await get<{ mimetype?: string; data?: string }>(
      `/api/${name}/auth/qr`,
      { headers: { Accept: "application/json" } } as any,
    );
    qrData.value =
      data?.mimetype && data?.data
        ? `data:${data.mimetype};base64,${data.data}`
        : "";
    startQrRefresh(name);
  } catch (err: unknown) {
    const msg =
      (err as { data?: { message?: string } })?.data?.message ??
      "Failed to load QR code";
    error(msg);
    qrData.value = "";
  }
}

// QR codes rotate server-side roughly every 20s; refresh while the modal
// is open so the user never scans an expired code.
let qrRefreshTimer: ReturnType<typeof setInterval> | null = null;

async function fetchQr(name: string) {
  try {
    const data = await get<{ mimetype?: string; data?: string }>(
      `/api/${name}/auth/qr`,
      { headers: { Accept: "application/json" } } as any,
    );
    qrData.value =
      data?.mimetype && data?.data
        ? `data:${data.mimetype};base64,${data.data}`
        : "";
  } catch (err: unknown) {
    // Transient failures keep the previous frame on screen
    if (!qrData.value) {
      error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to load QR code",
      );
    }
  }
}

function startQrRefresh(name: string) {
  stopQrRefresh();
  qrRefreshTimer = setInterval(async () => {
    const session = sessions.value.find((s) => s.name === name);
    if (session && session.status !== "SCAN_QR_CODE") {
      qrSession.value = "";
      stopQrRefresh();
      await loadSessions();
      return;
    }
    fetchQr(name);
  }, 15_000);
}

function stopQrRefresh() {
  if (qrRefreshTimer) {
    clearInterval(qrRefreshTimer);
    qrRefreshTimer = null;
  }
}

// ---- Account Status (timelock + capping) ----
async function openAccountStatus(name: string) {
  statusTarget.value = name;
  statusLoading.value = true;
  statusTimelock.value = null;
  statusCapping.value = null;
  const [timelockRes, cappingRes] = await Promise.allSettled([
    get<ReachoutTimelock>(`/api/sessions/${name}/timelock`),
    get<MessageCapping>(`/api/sessions/${name}/capping`),
  ]);
  if (timelockRes.status === "fulfilled") statusTimelock.value = timelockRes.value;
  if (cappingRes.status === "fulfilled") statusCapping.value = cappingRes.value;
  statusLoading.value = false;
}

function formatTime(unix: number | null | undefined): string {
  if (!unix || unix < 1) return "-";
  // WAHA may report seconds or milliseconds
  const ms = unix > 1e12 ? unix : unix * 1000;
  return new Date(ms).toLocaleString();
}

function cappingBadgeClass(status: string): string {
  if (status === "CAPPED") return "badge-failed";
  if (status.includes("WARN")) return "badge-scan";
  return "badge-working";
}

const quotaPercent = computed(() => {
  const c = statusCapping.value;
  if (!c || !c.totalQuota) return 0;
  return Math.min(100, Math.round((c.usedQuota / c.totalQuota) * 100));
});

// ---- Realtime (WS session.status overlay) ----
const { applyTo: applyLiveStatuses, ensureConnected, connected } = useWahaRealtime();
// ---- Modal helpers ----
function closeModal() {
  showCreate.value = false;
  editTarget.value = null;
  form.name = "";
  form.engine = "";
  form.tags = "";
  form.start = true;
}

// ---- Recovery ----
async function recoverAll() {
  try {
    const result = await post<{ recovered: number; sessions: string[] }>(
      "/api/health/sessions/recover-all",
      {}
    );
    success(t("toast.recovered", { n: result.recovered }));
    await loadSessions();
  } catch (e) {
    error(t("toast.recoverFail") + extractApiError(e));
  }
}

// ---- Poll ----
// WS delivers live statuses; polling refreshes richer fields (me, engine).
// Poll fast when realtime is down, slow when it is feeding us updates.
let pollTimer: ReturnType<typeof setTimeout> | null = null;

function pollIntervalMs(): number {
  return connected.value ? 15_000 : 3_000;
}

function schedulePoll() {
  pollTimer = setTimeout(async () => {
    await loadSessions();
    schedulePoll();
  }, pollIntervalMs());
}

function startPolling() {
  stopPolling();
  schedulePoll();
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

onMounted(async () => {
  // ✅ Load cached sessions first (instant UI display)
  const cached = localStorage.getItem("waha_sessions_cache");
  if (cached) {
    try {
      sessions.value = JSON.parse(cached);
    } catch {
      // Ignore cache parse errors
    }
  }
  
  await Promise.allSettled([loadSessions(), loadEngines()]);
  ensureConnected();
  startPolling();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopPolling();
    } else {
      loadSessions();
      startPolling();
    }
  });
});

watch(qrSession, (v) => {
  if (!v) stopQrRefresh();
});

onUnmounted(() => {
  stopPolling();
  stopQrRefresh();
});
</script>

<style scoped>
/* ── Stat Cards ── */
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

.stat-working {
  color: var(--accent);
}
.stat-failed {
  color: #ef4444;
}
.stat-stopped {
  color: var(--text-dim);
}
.stat-scan {
  color: #60a5fa;
}
/* ── 5-column grid for stat cards ── */
.grid-5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}
@media (max-width: 900px) {
  .grid-5 {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 600px) {
  .grid-5 {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── Filter Bar ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  flex: 1;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 36px;
}

.filter-tab:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.filter-tab.active {
  background: rgba(34, 197, 94, 0.12);
  border-color: var(--accent);
  color: var(--accent);
}

.filter-tab-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-all {
  background: var(--text-dim);
}
.dot-working {
  background: #4ade80;
}
.dot-starting {
  background: #fbbf24;
}
.dot-stopped {
  background: #9ca3af;
}
.dot-scan-qr-code {
  background: #60a5fa;
}
.dot-failed {
  background: #f87171;
}

.filter-count {
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 99px;
  background: var(--surface-hover);
  color: var(--text-dim);
}

.filter-tab.active .filter-count {
  background: rgba(34, 197, 94, 0.2);
  color: var(--accent);
}

.filter-search {
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  min-width: 200px;
}

.filter-search:focus {
  outline: none;
  border-color: var(--accent);
}

/* ── Bulk Bar ── */
.bulk-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: var(--radius);
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.bulk-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  margin-right: 4px;
}

/* ── Sessions Grid ── */
.sessions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 1100px) {
  .sessions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .sessions-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Session Card ── */
.session-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s;
  position: relative;
}

.session-card.selected {
  border-color: var(--accent);
  background: rgba(34, 197, 94, 0.04);
}

.session-card-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.session-checkbox {
  margin-top: 3px;
  cursor: pointer;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.session-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--accent);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  font-family: var(--font-mono, monospace);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-phone {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-dim {
  color: var(--text-dim);
}

/* ── Meta Row (engine + tags) ── */
.session-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.session-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 99px;
  background: rgba(34, 197, 94, 0.1);
  color: var(--accent);
  border: 1px solid rgba(34, 197, 94, 0.2);
  cursor: pointer;
  transition: all 0.15s;
}

.tag-pill:hover,
.tag-pill.active {
  background: rgba(34, 197, 94, 0.2);
  border-color: var(--accent);
}

/* ── Action Buttons ── */
.session-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 4px;
  border-top: 1px solid var(--border);
}

.action-btn {
  flex: 1;
  min-width: 0;
  min-height: 38px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.15s;
  white-space: nowrap;
}

.action-btn:hover {
  border-color: var(--border-hover);
}

.action-start {
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.3);
}
.action-start:hover {
  background: rgba(34, 197, 94, 0.15);
  border-color: var(--accent);
}

.action-restart {
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.3);
}
.action-restart:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
}

.action-qr {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.3);
}
.action-qr:hover {
  background: rgba(251, 191, 36, 0.15);
  border-color: #f59e0b;
}

.action-settings {
  color: var(--text-dim);
}
.action-settings:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.action-delete {
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.2);
}
.action-delete:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
}

/* ── Mobile filter bar ── */
@media (max-width: 600px) {
  .filter-bar {
    flex-direction: column;
  }
  .filter-search {
    width: 100%;
    min-width: unset;
  }
  .action-btn {
    min-height: 44px;
    font-size: 12px;
    padding: 8px 8px;
  }
}

/* ── Account Status Modal ── */
.status-section {
  margin-bottom: 18px;
}

.status-section-title {
  font-size: 12px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  font-weight: 600;
}

.status-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--text-muted);
}

.status-row code {
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono, monospace);
  font-size: 12px;
}

.status-empty {
  font-size: 13px;
  color: var(--text-dim);
  padding: 4px 0;
}

.quota-bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0;
}

.quota-bar {
  flex: 1;
  height: 8px;
  border-radius: 99px;
  background: var(--surface);
  border: 1px solid var(--border);
  overflow: hidden;
}

.quota-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}

.quota-fill.quota-warn {
  background: var(--danger);
}

.quota-pct {
  font-size: 12px;
  color: var(--text-dim);
  min-width: 34px;
  text-align: right;
}
</style>
