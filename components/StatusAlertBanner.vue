<template>
  <div
    v-if="visible"
    class="alert-banner"
    :class="kindClass"
    role="status"
  >
    <span class="alert-icon">{{ icon }}</span>
    <span class="alert-text">
      {{ text }}
      <button class="alert-link" @click="$emit('jump')">
        {{ t("banner.viewSessions") }}
      </button>
    </span>
    <button class="alert-dismiss" aria-label="Dismiss" @click="dismiss">
      ✕
    </button>
  </div>
</template>

<script setup lang="ts">
const { alerts, ensureConnected } = useWahaRealtime();
const { t } = useLocale();

const dismissed = ref(false);
const dismissedSignature = ref("");

const signature = computed(() =>
  alerts.value.map((a) => `${a.session}:${a.kind}`).sort().join(","),
);

// Re-show the banner whenever the alert set CHANGES (new failure appears),
// but stay hidden for a set the user already dismissed.
watch(signature, () => {
  if (signature.value !== dismissedSignature.value) {
    dismissed.value = false;
  }
});

const visible = computed(
  () => alerts.value.length > 0 && !dismissed.value,
);

const failed = computed(() => alerts.value.filter((a) => a.kind === "FAILED"));
const qr = computed(() => alerts.value.filter((a) => a.kind === "SCAN_QR_CODE"));

const kindClass = computed(() =>
  failed.value.length > 0 ? "alert-danger" : "alert-warning",
);

const icon = computed(() => (failed.value.length > 0 ? "⊘" : "⊡"));

const text = computed(() => {
  const parts: string[] = [];
  if (failed.value.length > 0) {
    parts.push(
      `${t("alert.failedSessions", { n: failed.value.length })}: ${failed.value.map((f) => f.session).join(", ")}`,
    );
  }
  if (qr.value.length > 0) {
    parts.push(
      `${t("alert.qrSessions", { n: qr.value.length })}: ${qr.value.map((f) => f.session).join(", ")}`,
    );
  }
  return parts.join(" · ");
});

function dismiss() {
  dismissed.value = true;
  dismissedSignature.value = signature.value;
}

defineExpose({ dismiss });

onMounted(() => ensureConnected());
</script>

<style scoped>
.alert-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  margin-bottom: 16px;
  font-size: 13px;
}

.alert-danger {
  background: var(--danger-surface);
  border-color: rgba(239, 68, 68, 0.4);
  color: var(--danger);
}

.alert-warning {
  background: var(--warning-surface);
  border-color: rgba(245, 158, 11, 0.4);
  color: var(--warning);
}

.alert-icon {
  font-size: 15px;
}

.alert-text {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.alert-link {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
  text-decoration: underline;
  padding: 0;
  margin-left: 6px;
}

.alert-dismiss {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
  padding: 2px 6px;
  border-radius: 4px;
}

.alert-dismiss:hover {
  opacity: 1;
}
</style>
