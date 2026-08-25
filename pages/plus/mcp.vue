<template>
  <div class="page-wrapper">
    <div class="page-header">
      <div class="page-title">{{ t("plus.mcp.title") }}</div>
      <div class="page-subtitle">{{ t("plus.mcp.subtitle") }}</div>
    </div>

    <div class="card" style="margin-bottom: 24px">
      <div class="form-label">{{ t("mcp.url") }}</div>
      <div style="display: flex; gap: 10px; margin-top: 8px">
        <input
          readonly
          :value="mcpUrl"
          style="font-family: var(--font-mono); font-size: 12px"
        />
        <button
          class="btn-secondary"
          style="white-space: nowrap"
          @click="copyUrl"
        >
          {{ t("action.copy") }}
        </button>
      </div>
    </div>

    <div class="tab-row">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-if="activeTab === 'claude-desktop'"
      class="card"
      style="
        margin-top: 0;
        border-top: none;
        border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      "
    >
      <div class="section-title">{{ t("mcp.claudeDesktop") }}</div>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px">
        {{ t("mcp.addTo") }}
        <code style="font-family: var(--font-mono); color: var(--accent)"
          >~/Library/Application Support/Claude/claude_desktop_config.json</code
        >
      </p>
      <div class="code-block">{{ claudeDesktopConfig }}</div>
      <button
        class="btn-secondary"
        style="margin-top: 12px"
        @click="copy(claudeDesktopConfig)"
      >
        {{ t("mcp.copyConfig") }}
      </button>
    </div>

    <div
      v-if="activeTab === 'claude-code'"
      class="card"
      style="
        margin-top: 0;
        border-top: none;
        border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      "
    >
      <div class="section-title">{{ t("mcp.claudeCode") }}</div>
      <div class="code-block">{{ claudeCodeCmd }}</div>
      <button
        class="btn-secondary"
        style="margin-top: 12px"
        @click="copy(claudeCodeCmd)"
      >
        {{ t("mcp.copyCommand") }}
      </button>
    </div>

    <div
      v-if="activeTab === 'other'"
      class="card"
      style="
        margin-top: 0;
        border-top: none;
        border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      "
    >
      <div class="section-title">{{ t("mcp.genericConfig") }}</div>
      <div class="code-block">{{ genericConfig }}</div>
      <button
        class="btn-secondary"
        style="margin-top: 12px"
        @click="copy(genericConfig)"
      >
        {{ t("mcp.copyConfig") }}
      </button>
    </div>

    <div class="section-title" style="margin-top: 28px">
      {{ t("mcp.availableTools", { n: tools.length }) }}
    </div>

    <div class="tools-grid">
      <div v-for="tool in tools" :key="tool.name" class="tool-card card">
        <div class="tool-name">{{ tool.name }}</div>
        <div class="tool-desc">{{ tool.desc }}</div>
      </div>
    </div>

    <div class="card" style="margin-top: 24px">
      <div class="section-title">{{ t("mcp.tester") }}</div>
      <div class="form-group">
        <label class="form-label">{{ t("ak.session") }}</label>
        <select v-model="tester.session" style="max-width: 240px">
          <option v-for="s in sessions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">{{ t("mcp.tool") }}</label>
        <select v-model="tester.tool" style="max-width: 240px">
          <option v-for="t in tools" :key="t.name" :value="t">
            {{ t.name }}
          </option>
        </select>
      </div>
      <div v-if="tester.tool" class="form-group">
        <label class="form-label">{{ t("mcp.paramsJson") }}</label>
        <textarea
          v-model="tester.params"
          rows="4"
          :placeholder="tester.tool.example"
          style="font-family: var(--font-mono); font-size: 12px"
        />
      </div>
      <button class="btn-primary" @click="runTool">{{ t("mcp.runTool") }}</button>
      <div v-if="tester.result !== null" style="margin-top: 16px">
        <div class="form-label">{{ t("mcp.response") }}</div>
        <div
          class="code-block"
          style="margin-top: 6px; max-height: 240px; overflow-y: auto"
        >
          {{ JSON.stringify(tester.result, null, 2) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale();
interface McpTool {
  name: string;
  desc: string;
  endpoint: string;
  example: string;
}

const { get, post, init, apiKey } = useWahaApi();
const { success, error } = useToast();

const sessions = ref<string[]>([]);
const activeTab = ref("claude-desktop");

const tabs = computed(() => [
  { id: "claude-desktop", label: t("mcp.tabDesktop") },
  { id: "claude-code", label: t("mcp.tabCode") },
  { id: "other", label: t("mcp.tabOther") },
]);

const origin = computed(() =>
  typeof window !== "undefined" ? window.location.origin : "",
);

const mcpUrl = computed(() => `${origin.value}/mcp/`);

const claudeDesktopConfig = computed(() =>
  JSON.stringify(
    {
      mcpServers: {
        waha: {
          url: mcpUrl.value,
          headers: { "X-Api-Key": apiKey.value },
        },
      },
    },
    null,
    2,
  ),
);

const claudeCodeCmd = computed(
  () =>
    `claude mcp add --url ${mcpUrl.value} --header "X-Api-Key: ${apiKey.value}" waha`,
);

const genericConfig = computed(() =>
  JSON.stringify(
    {
      name: "waha",
      url: mcpUrl.value,
      transport: "http",
      headers: { "X-Api-Key": apiKey.value },
    },
    null,
    2,
  ),
);

const tools = computed<McpTool[]>(() => [
  {
    name: "waha_send_text",
    desc: t("mcp.toolSendText"),
    endpoint: "/api/{session}/sendText",
    example: '{"chatId":"123@s.whatsapp.net","text":"Hello"}',
  },
  {
    name: "waha_send_image",
    desc: t("mcp.toolSendImage"),
    endpoint: "/api/{session}/sendImage",
    example:
      '{"chatId":"123@s.whatsapp.net","file":{"url":"https://example.com/img.jpg"}}',
  },
  {
    name: "waha_send_file",
    desc: t("mcp.toolSendFile"),
    endpoint: "/api/{session}/sendFile",
    example:
      '{"chatId":"123@s.whatsapp.net","file":{"url":"https://example.com/file.pdf"}}',
  },
  {
    name: "waha_send_buttons",
    desc: t("mcp.toolSendButtons"),
    endpoint: "/api/{session}/sendButtons",
    example: '{"chatId":"123@s.whatsapp.net","buttons":[]}',
  },
  {
    name: "waha_send_list",
    desc: t("mcp.toolSendList"),
    endpoint: "/api/{session}/sendList",
    example: '{"chatId":"123@s.whatsapp.net","sections":[]}',
  },
  {
    name: "waha_get_chats",
    desc: t("mcp.toolGetChats"),
    endpoint: "/api/{session}/chats",
    example: "{}",
  },
  {
    name: "waha_get_messages",
    desc: t("mcp.toolGetMessages"),
    endpoint: "/api/{session}/chats/{chatId}/messages",
    example: '{"chatId":"123@s.whatsapp.net"}',
  },
  {
    name: "waha_get_contacts",
    desc: t("mcp.toolGetContacts"),
    endpoint: "/api/{session}/contacts",
    example: "{}",
  },
  {
    name: "waha_check_number",
    desc: t("mcp.toolCheckNumber"),
    endpoint: "/api/{session}/contacts/check-exists",
    example: '{"phone":"1234567890"}',
  },
  {
    name: "waha_get_sessions",
    desc: t("mcp.toolGetSessions"),
    endpoint: "/api/sessions",
    example: "{}",
  },
  {
    name: "waha_start_session",
    desc: t("mcp.toolStartSession"),
    endpoint: "/api/sessions/{session}/start",
    example: "{}",
  },
  {
    name: "waha_stop_session",
    desc: t("mcp.toolStopSession"),
    endpoint: "/api/sessions/{session}/stop",
    example: "{}",
  },
  {
    name: "waha_get_profile",
    desc: t("mcp.toolGetProfile"),
    endpoint: "/api/{session}/profile",
    example: "{}",
  },
  {
    name: "waha_set_status",
    desc: t("mcp.toolSetStatus"),
    endpoint: "/api/{session}/profile/status",
    example: '{"status":"Available"}',
  },
  {
    name: "waha_typing",
    desc: t("mcp.toolTyping"),
    endpoint: "/api/{session}/startTyping",
    example: '{"chatId":"123@s.whatsapp.net"}',
  },
]);

const tester = reactive({
  session: "",
  tool: null as McpTool | null,
  params: "{}",
  result: null as unknown,
});

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(mcpUrl.value);
    success(t("action.copied"));
  } catch (e) {
    error(t("toast.copyFail") + extractApiError(e));
  }
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    success(t("action.copied"));
  } catch (e) {
    error(t("toast.copyFail") + extractApiError(e));
  }
}

async function loadSessions() {
  try {
    const data = await get<{ name: string }[]>("/api/sessions?all=true");
    sessions.value = data.map((s) => s.name);
    if (sessions.value.length > 0 && !tester.session) {
      tester.session = sessions.value[0];
    }
  } catch (e) {
    error(t("toast.loadSessionsFail") + extractApiError(e));
  }
}

async function runTool() {
  if (!tester.tool || !tester.session) return;
  let params: Record<string, unknown>;
  try {
    params = JSON.parse(tester.params);
  } catch {
    error(t("toast.invalidJsonParams"));
    return;
  }
  try {
    const endpoint = tester.tool.endpoint.replace("{session}", tester.session);
    const data = await post<unknown>(endpoint, params);
    tester.result = data;
  } catch (e) {
    tester.result = { error: String(e) };
  }
}

onMounted(async () => {
  await init();
  await loadSessions();
});
</script>
