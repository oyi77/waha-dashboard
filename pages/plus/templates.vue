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
        <div class="page-title">{{ t("plus.templates.title") }}</div>
        <div class="page-subtitle">{{ t("plus.templates.subtitle") }}</div>
      </div>
      <button class="btn-primary" @click="showCreate = true">
        {{ t("tpl.newTemplate") }}
      </button>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⟳</div>
      <div class="empty-state-text">{{ t("tpl.loading") }}</div>
    </div>

    <div v-else-if="templates.length === 0" class="empty-state">
      <div class="empty-state-icon">▣</div>
      <div class="empty-state-text">{{ t("tpl.none") }}</div>
    </div>

    <div v-else class="card" style="padding: 0">
      <div style="overflow-x: auto">
      <table>
        <thead>
          <tr>
            <th>{{ t("tpl.name") }}</th>
            <th>{{ t("tpl.type") }}</th>
            <th>{{ t("form.tags") }}</th>
            <th>{{ t("table.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tmpl in templates" :key="tmpl.id">
            <td style="font-weight: 500; color: var(--text)">
              {{ tmpl.name }}
            </td>
            <td>
              <span class="badge badge-working">{{ tmpl.type }}</span>
            </td>
            <td>
              <span
                v-for="tag in tmpl.tags || []"
                :key="tag"
                class="badge badge-stopped"
                style="margin-right: 4px"
                >{{ tag }}</span
              >
            </td>
            <td>
              <div style="display: flex; gap: 6px">
                <button class="btn-secondary" :aria-label="t('tpl.sendTitle')" @click="openSend(tmpl)">
                  {{ t("tpl.sendBtn") }}
                </button>
                <button class="btn-danger" :aria-label="t('tpl.deleteTitle')" @click="confirmDelete(tmpl)">
                  ✕
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div
      v-if="showCreate"
      class="modal-overlay"
      @click.self="showCreate = false"
    >
      <div class="modal-box">
        <div class="modal-title">{{ t("tpl.createTitle") }}</div>
        <div class="form-group">
          <label class="form-label">{{ t("tpl.name") }}</label>
          <input v-model="createForm.name" placeholder="my-template" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t("tpl.type") }}</label>
          <select v-model="createForm.type">
            <option value="text">{{ t("tpl.typeText") }}</option>
            <option value="image">{{ t("tpl.typeImage") }}</option>
            <option value="file">{{ t("tpl.typeFile") }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t("tpl.tagsCsv") }}</label>
          <input v-model="createForm.tags" placeholder="tag1, tag2" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t("tpl.payloadJson") }}</label>
          <textarea
            v-model="createForm.payload"
            rows="5"
            placeholder='{"text": "Hello, {{name}}!"}'
            style="font-family: var(--font-mono); font-size: 12px"
          />
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px">
          <button
            class="btn-secondary"
            style="flex: 1"
            @click="showCreate = false"
          >
            {{ t("action.cancel") }}
          </button>
          <button class="btn-primary" style="flex: 1" @click="createTemplate">
            {{ t("action.create") }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="deleteConfirm.open"
      class="modal-overlay"
      @click.self="deleteConfirm.open = false"
    >
      <div class="modal-box">
        <div class="modal-title">{{ t("tpl.deleteTitle") }}</div>
        <p style="color: var(--text-dim); font-size: 13px; margin-bottom: 20px">
          {{ t("tpl.deleteSure") }} <strong style="color: var(--text)">{{ deleteConfirm.name }}</strong>?
        </p>
        <div style="display: flex; gap: 10px">
          <button class="btn-secondary" style="flex: 1" @click="deleteConfirm.open = false">
            {{ t("action.cancel") }}
          </button>
          <button class="btn-danger" style="flex: 1" @click="deleteTemplate">
            {{ t("action.remove") }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="sendModal.open"
      class="modal-overlay"
      @click.self="sendModal.open = false"
    >
      <div class="modal-box">
        <div class="modal-title">{{ t("tpl.sendTitle") }} — {{ sendModal.name }}</div>
        <div class="form-group">
          <label class="form-label">{{ t("ak.session") }}</label>
          <select v-model="sendModal.session">
            <option value="">{{ t("ak.selectSession") }}</option>
            <option v-for="s in sessions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t("sc.chatId") }}</label>
          <input
            v-model="sendModal.chatId"
            placeholder="1234567890@s.whatsapp.net"
          />
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px">
          <button
            class="btn-secondary"
            style="flex: 1"
            @click="sendModal.open = false"
          >
            {{ t("action.cancel") }}
          </button>
          <button class="btn-primary" style="flex: 1" @click="sendTemplate">
            {{ t("tpl.sendAction") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale();
interface Template {
  id: string;
  name: string;
  type: string;
  tags?: string[];
}

const { get, post, del } = useWahaApi();
const { success, error } = useToast();

const templates = ref<Template[]>([]);
const loading = ref(true);
const sessions = ref<string[]>([]);
const showCreate = ref(false);

const createForm = reactive({
  name: "",
  type: "text",
  tags: "",
  payload: '{"text": "Hello!"}',
});

const deleteConfirm = reactive({
  open: false,
  id: "",
  name: "",
});

const sendModal = reactive({
  open: false,
  id: "",
  name: "",
  session: "",
  chatId: "",
});

async function loadTemplates() {
  loading.value = true;
  try {
    const data = await get<Template[]>("/api/templates");
    templates.value = data;
  } catch (e) {
    error(t("tpl.loadFail") + extractApiError(e));
  } finally {
    loading.value = false;
  }
}

async function loadSessions() {
  try {
    const data = await get<{ name: string }[]>("/api/sessions?all=true");
    sessions.value = data.map((s) => s.name);
  } catch (e) { error(t("toast.loadSessionsFail") + extractApiError(e)); }
}

async function createTemplate() {
  if (!createForm.name) {
    error(t("tpl.nameRequired"));
    return;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(createForm.payload);
  } catch {
    error(t("toast.invalidJson"));
    return;
  }
  try {
    await post("/api/templates", {
      name: createForm.name,
      type: createForm.type,
      tags: createForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      payload: payload,
    });
    success(t("tpl.created"));
    showCreate.value = false;
    createForm.name = "";
    createForm.tags = "";
    createForm.payload = '{"text": "Hello!"}';
    await loadTemplates();
  } catch (e) {
    error(t("tpl.createFail") + extractApiError(e));
  }
}

function confirmDelete(tmpl: Template) {
  deleteConfirm.open = true;
  deleteConfirm.id = tmpl.id;
  deleteConfirm.name = tmpl.name;
}

async function deleteTemplate() {
  const id = deleteConfirm.id;
  deleteConfirm.open = false;
  try {
    await del(`/api/templates/${id}`);
    success(t("toast.deleted"));
    await loadTemplates();
  } catch (e) {
    error(t("tpl.deleteFail") + extractApiError(e));
  }
}

function openSend(tmpl: Template) {
  sendModal.open = true;
  sendModal.id = tmpl.id;
  sendModal.name = tmpl.name;
  sendModal.session = sessions.value[0] ?? "";
  sendModal.chatId = "";
}

async function sendTemplate() {
  if (!sendModal.session || !sendModal.chatId) {
    error(t("tpl.requiredFields"));
    return;
  }
  try {
    await post(`/api/templates/${sendModal.id}/send`, {
      session: sendModal.session,
      chatId: sendModal.chatId,
    });
    success(t("tpl.sentOk"));
    sendModal.open = false;
  } catch (e) {
    error(t("tpl.sendFail") + extractApiError(e));
  }
}

onMounted(async () => {
  await Promise.allSettled([loadTemplates(), loadSessions()]);
});
</script>
