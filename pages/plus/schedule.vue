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
        <div class="page-title">{{ t("plus.schedule.title") }}</div>
        <div class="page-subtitle">{{ t("plus.schedule.subtitle") }}</div>
      </div>
      <button class="btn-ghost" @click="loadScheduled">⟳ Refresh</button>
    </div>

    <div class="layout-grid">
      <div class="card">
        <div class="section-title">{{ t("sc.newMsg") }}</div>
        <div class="form-group">
          <label class="form-label">{{ t("ak.session") }}</label>
          <select v-model="form.session">
            <option value="">{{ t("ak.selectSession") }}</option>
            <option v-for="s in sessions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t("sc.chatId") }}</label>
          <input
            v-model="form.chatId"
            placeholder="1234567890@s.whatsapp.net"
          />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t("sc.messageType") }}</label>
          <select v-model="form.type">
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="template">Template</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t("sc.sendAt") }}</label>
          <input v-model="form.sendAt" type="datetime-local" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t("tpl.payloadJson") }}</label>
          <textarea
            v-model="form.payload"
            rows="5"
            placeholder='{"text": "Hello!"}'
            style="font-family: var(--font-mono); font-size: 12px"
          />
        </div>
        <button
          class="btn-primary"
          style="width: 100%"
          @click="scheduleMessage"
        >
          Schedule
        </button>
      </div>

      <div>
        <div class="section-title">
          {{ t("sc.listTitle", { n: scheduled.length }) }}
        </div>
        <div v-if="loading" class="empty-state">
          <div class="empty-state-icon">⟳</div>
          <div class="empty-state-text">{{ t("sc.loading") }}</div>
        </div>
        <div v-else-if="scheduled.length === 0" class="empty-state">
          <div class="empty-state-icon">◷</div>
          <div class="empty-state-text">{{ t("sc.none") }}</div>
        </div>
        <div v-else class="card" style="padding: 0; overflow: hidden">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Session</th>
                <th>Chat ID</th>
                <th>Send At</th>
                <th>Type</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in scheduled" :key="item.id">
                <td
                  style="
                    font-family: var(--font-mono);
                    color: var(--text-dim);
                    font-size: 11px;
                  "
                >
                  {{ item.id }}
                </td>
                <td>{{ item.session }}</td>
                <td style="font-size: 12px; color: var(--text-muted)">
                  {{ item.chatId }}
                </td>
                <td style="font-size: 12px">{{ formatDate(item.sendAt) }}</td>
                <td>
                  <span class="badge badge-working">{{ item.type }}</span>
                </td>
                <td>
                  <button class="btn-danger" @click="deleteScheduled(item.id)">
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale();
interface Scheduled {
  id: string;
  session: string;
  chatId: string;
  sendAt: string;
  type: string;
}

const { get, post, del } = useWahaApi();
const { success, error } = useToast();

const sessions = ref<string[]>([]);
const scheduled = ref<Scheduled[]>([]);
const loading = ref(true);

const form = reactive({
  session: "",
  chatId: "",
  type: "text",
  sendAt: "",
  payload: '{"text": "Hello!"}',
});

function formatDate(dt: string): string {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

async function loadSessions() {
  try {
    const data = await get<{ name: string }[]>("/api/sessions?all=true");
    sessions.value = data.map((s) => s.name);
    if (sessions.value.length > 0 && !form.session) {
      form.session = sessions.value[0];
    }
  } catch (e) {
    error("Failed to load sessions: " + extractApiError(e));
  }
}

async function loadScheduled() {
  loading.value = true;
  try {
    const data = await get<Scheduled[]>("/api/schedule");
    scheduled.value = data;
  } catch (e) {
    error("Failed to load scheduled messages: " + extractApiError(e));
  } finally {
    loading.value = false;
  }
}

async function scheduleMessage() {
  if (!form.session || !form.chatId || !form.sendAt) {
    error("Session, Chat ID, and Send At are required");
    return;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(form.payload);
  } catch {
    error("Invalid JSON payload");
    return;
  }
  try {
    await post("/api/schedule", {
      session: form.session,
      chatId: form.chatId,
      type: form.type,
      sendAt: form.sendAt,
      payload: payload,
    });
    success("Message scheduled");
    form.chatId = "";
    form.sendAt = "";
    form.payload = '{"text": "Hello!"}';
    await loadScheduled();
  } catch (e) {
    error("Failed to schedule message: " + extractApiError(e));
  }
}

async function deleteScheduled(id: string) {
  try {
    await del(`/api/schedule/${id}`);
    success("Deleted");
    await loadScheduled();
  } catch (e) {
    error("Failed to delete: " + extractApiError(e));
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await Promise.allSettled([loadSessions(), loadScheduled()]);
  pollTimer = setInterval(loadScheduled, 30000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.layout-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 900px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
}
</style>
