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
      <div style="display: flex; gap: 10px; align-items: center">
        <button class="btn-ghost" @click="loadSessions">⟳ Refresh</button>
        <button class="btn-primary" @click="showCreate = true">
          + New Session
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⟳</div>
      <div class="empty-state-text">Loading sessions…</div>
    </div>

    <div v-else-if="sessions.length === 0" class="empty-state">
      <div class="empty-state-icon">◎</div>
      <div class="empty-state-text">
        No sessions yet. Create one to get started.
      </div>
    </div>

    <div v-else class="sessions-grid stagger">
      <div
        v-for="session in sessions"
        :key="session.name"
        class="session-card card"
      >
        <div class="session-card-top">
          <div>
            <div class="session-name">{{ session.name }}</div>
            <div class="session-meta">
              <span class="badge" :class="statusClass(session.status)">
                <span class="badge-dot" />{{ session.status }}
              </span>
              <span
                class="badge"
                :class="`engine-${(session.engine || 'noweb').toLowerCase()}`"
              >
                {{ session.engine || "NOWEB" }}
              </span>
            </div>
          </div>
          <div class="session-actions">
            <button
              v-if="session.status === 'STOPPED'"
              class="btn-secondary"
              @click="confirmStart(session.name)"
            >
              ▶ Start
            </button>
            <button
              v-if="session.status === 'WORKING'"
              class="btn-ghost"
              @click="confirmStop(session.name)"
            >
              ⏹ Stop
            </button>
            <button
              v-if="session.status === 'SCAN_QR_CODE'"
              class="btn-secondary"
              @click="openQr(session.name)"
            >
              ⊡ QR Code
            </button>
            <button class="btn-danger" @click="confirmDelete(session.name)">
              ✕
            </button>
          </div>
        </div>

        <div v-if="session.me" class="session-me">
          <span class="me-avatar">{{ avatarLetter(session.me.pushName) }}</span>
          <span>{{ session.me.pushName }}</span>
          <span class="text-dim" style="font-size: 12px"
            >+{{ session.me.id?.replace("@s.whatsapp.net", "") }}</span
          >
        </div>
      </div>
    </div>

    <div
      v-if="showCreate"
      class="modal-overlay"
      @click.self="showCreate = false"
    >
      <div class="modal-box">
        <div class="modal-title">Create Session</div>
        <div class="form-group">
          <label class="form-label">Session Name</label>
          <input v-model="createForm.name" placeholder="default" />
        </div>
        <div class="form-group">
          <label class="form-label">Engine</label>
          <select v-model="createForm.engine">
            <option value="">Auto</option>
            <option v-for="eng in engines" :key="eng" :value="eng">
              {{ eng }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Start on create</label>
          <label class="toggle-switch">
            <input v-model="createForm.start" type="checkbox" />
            <span class="toggle-slider" />
          </label>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px">
          <button
            class="btn-secondary"
            style="flex: 1"
            @click="showCreate = false"
          >
            Cancel
          </button>
          <button class="btn-primary" style="flex: 1" @click="createSession">
            Create
          </button>
        </div>
      </div>
    </div>

    <div v-if="qrSession" class="modal-overlay" @click.self="qrSession = ''">
      <div class="modal-box" style="text-align: center">
        <div class="modal-title">Scan QR Code — {{ qrSession }}</div>
        <div v-if="qrData" style="margin: 20px auto">
          <img
            :src="qrData"
            alt="QR Code"
            style="max-width: 260px; border-radius: 8px"
          />
        </div>
        <div v-else class="empty-state-text" style="padding: 40px 0">
          Loading QR…
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

    <div
      v-if="confirmAction"
      class="modal-overlay"
      @click.self="confirmAction = null"
    >
      <div class="modal-box">
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
import { ref, reactive, onMounted, onUnmounted } from "vue";
import { useWahaApi } from "~/composables/useWahaApi";
import { useToast } from "~/composables/useToast";

interface Session {
  name: string;
  status: string;
  engine?: string;
  me?: { id?: string; pushName?: string };
}

interface ConfirmAction {
  title: string;
  message: string;
  label: string;
  danger: boolean;
  fn: () => void;
}

const { get, post, del } = useWahaApi();
const { success, error } = useToast();

const sessions = ref<Session[]>([]);
const engines = ref<string[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const qrSession = ref("");
const qrData = ref("");
const confirmAction = ref<ConfirmAction | null>(null);

const createForm = reactive({ name: "", engine: "", start: true });

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

async function loadSessions() {
  loading.value = true;
  try {
    const data = await get<Session[]>("/api/sessions?all=true");
    sessions.value = data;
  } catch (e) {
    error("Failed to load sessions");
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

async function createSession() {
  try {
    const body: Record<string, unknown> = {
      name: createForm.name.trim() || "default",
    };
    if (createForm.engine) body.engine = createForm.engine;
    await post("/api/sessions", body);
    if (createForm.start) {
      await post(`/api/sessions/${body.name}/start`);
    }
    success("Session created");
    showCreate.value = false;
    createForm.name = "";
    createForm.engine = "";
    createForm.start = true;
    await loadSessions();
  } catch (e) {
    error("Failed to create session");
  }
}

function confirmStart(name: string) {
  confirmAction.value = {
    title: "Start Session",
    message: `Start session "${name}"?`,
    label: "Start",
    danger: false,
    fn: async () => {
      confirmAction.value = null;
      try {
        await post(`/api/sessions/${name}/start`);
        success(`Session ${name} started`);
        await loadSessions();
      } catch {
        error("Failed to start session");
      }
    },
  };
}

function confirmStop(name: string) {
  confirmAction.value = {
    title: "Stop Session",
    message: `Stop session "${name}"?`,
    label: "Stop",
    danger: true,
    fn: async () => {
      confirmAction.value = null;
      try {
        await post(`/api/sessions/${name}/stop`);
        success(`Session ${name} stopped`);
        await loadSessions();
      } catch {
        error("Failed to stop session");
      }
    },
  };
}

function confirmDelete(name: string) {
  confirmAction.value = {
    title: "Delete Session",
    message: `Permanently delete session "${name}"? This cannot be undone.`,
    label: "Delete",
    danger: true,
    fn: async () => {
      confirmAction.value = null;
      try {
        await del(`/api/sessions/${name}`);
        success(`Session ${name} deleted`);
        await loadSessions();
      } catch {
        error("Failed to delete session");
      }
    },
  };
}

async function openQr(name: string) {
  qrSession.value = name;
  qrData.value = "";
  try {
    const data = await get<Record<string, unknown>>(
      `/api/sessions/${name}/auth/qr?format=image`,
    );
    qrData.value =
      typeof data?.data === "string"
        ? data.data
        : typeof data?.qr === "string"
          ? data.qr
          : "";
  } catch {
    error("Failed to load QR code");
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await Promise.allSettled([loadSessions(), loadEngines()]);
  pollTimer = setInterval(loadSessions, 10000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.session-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.session-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.session-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
}

.session-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.session-me {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.me-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.15);
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.text-dim {
  color: var(--text-dim);
}
</style>
