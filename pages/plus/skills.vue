<template>
  <div class="page-wrapper">
    <div class="page-header">
      <div class="page-title">{{ t("plus.skills.title") }}</div>
      <div class="page-subtitle">{{ t("plus.skills.subtitle") }}</div>
    </div>

    <!-- Skill: waha-send -->
    <div class="card" style="margin-bottom: 24px">
      <div
        style="
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        "
      >
        <span
          style="
            font-family: var(--font-mono);
            font-size: 16px;
            color: #4ade80;
            font-weight: 500;
          "
          >/waha-send</span
        >
        <span class="badge badge-active">{{ t("sk.badgeSend") }}</span>
      </div>
      <p
        style="
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 16px;
          line-height: 1.5;
        "
      >
        {{ t("sk.sendDesc") }}
      </p>
      <div style="position: relative">
        <div
          class="code-block"
          style="white-space: pre-wrap; padding-right: 80px"
        >
          {{ skillSend }}
        </div>
        <button
          class="btn-secondary"
          style="
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 12px;
            padding: 4px 10px;
          "
          @click="copyText(skillSend, 'send')"
        >
          {{ copied.send ? t("action.copied") : t("action.copy") }}
        </button>
      </div>
    </div>

    <!-- Skill: waha-broadcast -->
    <div class="card" style="margin-bottom: 24px">
      <div
        style="
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        "
      >
        <span
          style="
            font-family: var(--font-mono);
            font-size: 16px;
            color: #4ade80;
            font-weight: 500;
          "
          >/waha-broadcast</span
        >
        <span class="badge badge-active">{{ t("sk.badgeBroadcast") }}</span>
      </div>
      <p
        style="
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 16px;
          line-height: 1.5;
        "
      >
        {{ t("sk.broadcastDesc") }}
      </p>
      <div style="position: relative">
        <div
          class="code-block"
          style="white-space: pre-wrap; padding-right: 80px"
        >
          {{ skillBroadcast }}
        </div>
        <button
          class="btn-secondary"
          style="
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 12px;
            padding: 4px 10px;
          "
          @click="copyText(skillBroadcast, 'broadcast')"
        >
          {{ copied.broadcast ? t("action.copied") : t("action.copy") }}
        </button>
      </div>
    </div>

    <!-- Skill: waha-status -->
    <div class="card" style="margin-bottom: 24px">
      <div
        style="
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        "
      >
        <span
          style="
            font-family: var(--font-mono);
            font-size: 16px;
            color: #4ade80;
            font-weight: 500;
          "
          >/waha-status</span
        >
        <span class="badge badge-active">{{ t("sk.badgeStatus") }}</span>
      </div>
      <p
        style="
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 16px;
          line-height: 1.5;
        "
      >
        {{ t("sk.statusDesc") }}
      </p>
      <div style="position: relative">
        <div
          class="code-block"
          style="white-space: pre-wrap; padding-right: 80px"
        >
          {{ skillStatus }}
        </div>
        <button
          class="btn-secondary"
          style="
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 12px;
            padding: 4px 10px;
          "
          @click="copyText(skillStatus, 'status')"
        >
          {{ copied.status ? t("action.copied") : t("action.copy") }}
        </button>
      </div>
    </div>

    <!-- How to Install -->
    <div class="card" style="margin-bottom: 24px">
      <div class="section-title">{{ t("sk.howInstall") }}</div>
      <div
        style="
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
        "
      >
        <div
          v-for="step in installSteps"
          :key="step.num"
          style="display: flex; gap: 16px; align-items: flex-start"
        >
          <div
            style="
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: rgba(34, 197, 94, 0.15);
              border: 1px solid rgba(34, 197, 94, 0.3);
              color: #22c55e;
              font-size: 13px;
              font-weight: 600;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              margin-top: 2px;
            "
          >
            {{ step.num }}
          </div>
          <div>
            <div
              style="
                font-size: 14px;
                color: var(--text-primary);
                font-weight: 500;
                margin-bottom: 6px;
              "
            >
              {{ step.title }}
            </div>
            <div
              style="
                font-size: 13px;
                color: var(--text-muted);
                line-height: 1.5;
              "
              v-html="step.desc"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Alternative: MCP Connection -->
    <div class="card">
      <div class="section-title">{{ t("sk.mcpAlt") }}</div>
      <p
        style="
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 16px;
          line-height: 1.5;
        "
      >
        {{ t("sk.mcpAltDesc") }}
      </p>
      <div class="form-label" style="margin-bottom: 8px">
        {{ t("sk.ccSettings") }}<code
          style="font-family: var(--font-mono); color: var(--accent)"
          >~/.claude/settings.json</code
        >)
      </div>
      <div style="position: relative">
        <div
          class="code-block"
          style="white-space: pre-wrap; padding-right: 80px"
        >
          {{ mcpConfig }}
        </div>
        <button
          class="btn-secondary"
          style="
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 12px;
            padding: 4px 10px;
          "
          @click="copyText(mcpConfig, 'mcp')"
        >
          {{ copied.mcp ? t("action.copied") : t("action.copy") }}
        </button>
      </div>
      <p
        style="
          font-size: 12px;
          color: rgba(134, 239, 172, 0.5);
          margin-top: 12px;
        "
      >
        {{ t("sk.restartNote") }}
      </p>
      <p style="margin-top: 16px">
        <NuxtLink to="/plus/mcp" style="color: var(--accent); font-size: 13px">{{
          t("sk.viewDocs")
        }}</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale();
const { init, apiKey } = useWahaApi();
const { error } = useToast();
const origin = computed(() =>
  typeof window !== "undefined" ? window.location.origin : "",
);

const copied = reactive<Record<string, boolean>>({
  send: false,
  broadcast: false,
  status: false,
  mcp: false,
});

const skillSend = computed(() => {
  const url = origin.value;
  const key = apiKey.value;
  return `---
name: waha-send
description: Send WhatsApp messages via WAHA API
triggers:
  - send whatsapp
  - whatsapp message
---

Send a WhatsApp message via WAHA.

Steps:
1. Ask the user for:
   - Session name (default: "default")
   - Recipient phone number or chatId (e.g. "15551234567@c.us")
   - Message text to send

2. Call the WAHA API:
   POST ${url}/api/sendText
   Headers:
     Content-Type: application/json
     Authorization: Bearer ${key}
   Body:
     {
       "session": "<session>",
       "chatId": "<phone>@c.us",
       "text": "<message>"
     }

3. Show the API response to the user. If successful, confirm the message was sent.
   If an error occurs, explain what went wrong and suggest checking the session status.`;
});

const skillBroadcast = computed(() => {
  const url = origin.value;
  const key = apiKey.value;
  return `---
name: waha-broadcast
description: Broadcast WhatsApp messages to multiple contacts via WAHA API
triggers:
  - broadcast whatsapp
  - send to multiple
  - bulk whatsapp
---

Broadcast a WhatsApp message to multiple contacts via WAHA.

Steps:
1. Ask the user for:
   - Session name (default: "default")
   - List of recipient phone numbers (comma-separated or one per line)
   - Message text to send
   - Delay between messages in ms (default: 500, to avoid rate limiting)

2. Format the phone numbers as chatIds (add "@c.us" if not already present).

3. Call the WAHA broadcast API:
   POST ${url}/api/broadcast/text
   Headers:
     Content-Type: application/json
     Authorization: Bearer ${key}
   Body:
     {
       "session": "<session>",
       "chatIds": ["<phone1>@c.us", "<phone2>@c.us"],
       "text": "<message>",
       "delayMs": 500
     }

4. Show the result to the user: how many messages were sent successfully and any failures.`;
});

const skillStatus = computed(() => {
  const url = origin.value;
  const key = apiKey.value;
  return `---
name: waha-status
description: Check WAHA session status and get QR code for authentication
triggers:
  - waha status
  - whatsapp status
  - session qr
---

Check the status of a WAHA WhatsApp session.

Steps:
1. Ask the user for the session name (default: "default").

2. Fetch session info:
   GET ${url}/api/sessions/<session>
   Headers:
     Authorization: Bearer ${key}

3. Report the session status to the user:
   - WORKING: Session is connected and ready
   - STARTING: Session is initializing
   - SCAN_QR_CODE: User needs to scan a QR code
   - STOPPED: Session is not running
   - FAILED: Session encountered an error

4. If status is SCAN_QR_CODE, provide the QR code URL:
   ${url}/api/<session>/auth/qr
   Tell the user to open this URL in a browser to scan the QR code with their WhatsApp app.

5. If status is STOPPED or FAILED, offer to start/restart the session by calling:
   POST ${url}/api/sessions/start
   Body: { "name": "<session>" }`;
});

const mcpConfig = computed(() => {
  return JSON.stringify(
    {
      mcpServers: {
        waha: {
          type: "sse",
          url: `${origin.value}/api/mcp`,
          headers: { Authorization: `Bearer ${apiKey.value}` },
        },
      },
    },
    null,
    2,
  );
});

const installSteps = computed(() => [
  {
    num: 1,
    title: t("sk.step1Title"),
    desc: t("sk.step1Desc"),
  },
  {
    num: 2,
    title: t("sk.step2Title"),
    desc: t("sk.step2Desc"),
  },
  {
    num: 3,
    title: t("sk.step3Title"),
    desc: t("sk.step3Desc"),
  },
  {
    num: 4,
    title: t("sk.step4Title"),
    desc: t("sk.step4Desc"),
  },
]);

async function copyText(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text);
    copied[key] = true;
    setTimeout(() => {
      copied[key] = false;
    }, 1500);
  } catch (e) {
    error(t("toast.copyFail") + extractApiError(e));
  }
}

onMounted(() => init());
</script>

<style scoped>
.sk-code {
  font-family: var(--font-mono);
  font-size: 12px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 4px;
  padding: 1px 6px;
  color: #4ade80;
}
</style>
