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
        <div class="page-title">⚿ API Keys</div>
        <div class="page-subtitle">Manage API keys for WAHA access</div>
      </div>
      <button class="btn-primary" @click="showCreate = true">+ New Key</button>
    </div>

    <div v-if="keys.length === 0" class="empty-state">
      <div class="empty-state-icon">⚿</div>
      <div class="empty-state-text">No API keys</div>
    </div>

    <div v-else class="card" style="padding: 0; overflow: hidden">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Key</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="k in keys" :key="k.id">
            <td style="font-weight: 500; color: var(--text)">{{ k.name }}</td>
            <td>
              <span
                style="
                  font-family: var(--font-mono);
                  font-size: 12px;
                  color: var(--text-muted);
                "
              >
                {{ maskKey(k.key) }}
              </span>
              <button
                class="btn-ghost"
                style="margin-left: 8px; padding: 3px 8px; font-size: 11px"
                @click="copyKey(k.key)"
              >
                Copy
              </button>
            </td>
            <td>
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  :checked="k.active !== false"
                  @change="toggleKey(k)"
                />
                <span class="toggle-slider" />
              </label>
            </td>
            <td>
              <button class="btn-danger" @click="confirmDeleteKey(k.id)">
                ✕
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="showCreate"
      class="modal-overlay"
      @click.self="showCreate = false"
    >
      <div class="modal-box">
        <div class="modal-title">New API Key</div>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input v-model="createForm.name" placeholder="my-app" />
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px">
          <button
            class="btn-secondary"
            style="flex: 1"
            @click="showCreate = false"
          >
            Cancel
          </button>
          <button class="btn-primary" style="flex: 1" @click="createKey">
            Create
          </button>
        </div>
      </div>
    </div>

    <div v-if="createdKey" class="modal-overlay" @click.self="createdKey = ''">
      <div class="modal-box">
        <div class="modal-title">✓ API Key Created</div>
        <p
          style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px"
        >
          Copy this key now — it won't be shown again.
        </p>
        <div class="code-block" style="word-break: break-all; user-select: all">
          {{ createdKey }}
        </div>
        <button
          class="btn-secondary"
          style="width: 100%; margin-top: 14px"
          @click="copyKey(createdKey)"
        >
          Copy Key
        </button>
        <button
          class="btn-ghost"
          style="width: 100%; margin-top: 8px"
          @click="createdKey = ''"
        >
          Done
        </button>
      </div>
    </div>

    <div
      v-if="deleteTargetId"
      class="modal-overlay"
      @click.self="deleteTargetId = ''"
    >
      <div class="modal-box">
        <div class="modal-title">Delete API Key</div>
        <p
          style="color: var(--text-muted); font-size: 13px; margin-bottom: 24px"
        >
          Permanently delete this API key? Any clients using it will lose access
          immediately.
        </p>
        <div style="display: flex; gap: 10px">
          <button
            class="btn-ghost"
            style="flex: 1"
            @click="deleteTargetId = ''"
          >
            Cancel
          </button>
          <button class="btn-danger" style="flex: 1" @click="deleteKey">
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ApiKey {
  id: string;
  name: string;
  key: string;
  active?: boolean;
}

const { get, post, put, del } = useWahaApi();
const { success, error } = useToast();

const keys = ref<ApiKey[]>([]);
const showCreate = ref(false);
const createdKey = ref("");
const deleteTargetId = ref("");
const createForm = reactive({ name: "" });

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.substring(0, 6)}…${key.substring(key.length - 4)}`;
}

async function copyKey(key: string) {
  try {
    await navigator.clipboard.writeText(key);
    success("Copied to clipboard");
  } catch {
    error("Failed to copy");
  }
}

async function loadKeys() {
  try {
    const data = await get<ApiKey[]>("/api/keys");
    keys.value = data;
  } catch (e) {
    error("Failed to load keys");
  }
}

async function createKey() {
  if (!createForm.name) {
    error("Name is required");
    return;
  }
  try {
    const data = await post<ApiKey>("/api/keys", { name: createForm.name });
    success("Key created");
    showCreate.value = false;
    createdKey.value = data.key;
    createForm.name = "";
    await loadKeys();
  } catch {
    error("Failed to create key");
  }
}

function confirmDeleteKey(id: string) {
  deleteTargetId.value = id;
}

async function deleteKey() {
  const id = deleteTargetId.value;
  deleteTargetId.value = "";
  try {
    await del(`/api/keys/${id}`);
    success("Deleted");
    await loadKeys();
  } catch {
    error("Failed to delete key");
  }
}

async function toggleKey(k: ApiKey) {
  try {
    await put(`/api/keys/${k.id}`, { active: k.active === false });
    await loadKeys();
  } catch {
    error("Failed to update key");
  }
}

onMounted(loadKeys);
</script>
