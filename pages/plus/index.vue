<template>
  <div class="page-wrapper">
    <div class="page-header">
      <div class="page-title">{{ t("plus.index.title") }}</div>
      <div class="page-subtitle">{{ t("plus.index.subtitle") }}</div>
    </div>

    <div v-if="statsError" class="empty-state">
      <div class="empty-state-icon">!</div>
      <div class="empty-state-text">{{ t("plus.index.statsLoadFail") }}</div>
      <button class="btn-ghost" style="margin-top: 8px" @click="loadStats">{{ t("action.retry") }}</button>
    </div>
    <div v-else class="stats-row grid-3 stagger">
      <div class="stat-card">
        <div class="stat-card-value">{{ stats.scheduled }}</div>
        <div class="stat-card-label">{{ t("plus.index.stat.scheduled") }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">{{ stats.templates }}</div>
        <div class="stat-card-label">{{ t("plus.index.stat.templates") }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">{{ stats.rules }}</div>
        <div class="stat-card-label">{{ t("plus.index.stat.rules") }}</div>
      </div>
    </div>

    <div class="section-title" style="margin-top: 32px; margin-bottom: 16px">
      {{ t("plus.index.features") }}
    </div>

    <div class="features-grid stagger">
      <NuxtLink
        v-for="feat in features"
        :key="feat.href"
        :to="feat.href"
        class="feature-card"
      >
        <div class="feature-icon" aria-hidden="true">{{ feat.icon }}</div>
        <div class="feature-name">{{ t(feat.nameKey) }}</div>
        <div class="feature-desc">{{ t(feat.descKey) }}</div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale();
const { get } = useWahaApi();

const stats = reactive({ scheduled: 0, templates: 0, rules: 0 });
const statsError = ref(false);

const features = [
  { href: "/plus/sessions", icon: "◎", nameKey: "plus.index.feat.sessions", descKey: "plus.index.feat.sessions.desc" },
  { href: "/plus/schedule", icon: "◷", nameKey: "plus.index.feat.schedule", descKey: "plus.index.feat.schedule.desc" },
  { href: "/plus/templates", icon: "▣", nameKey: "plus.index.feat.templates", descKey: "plus.index.feat.templates.desc" },
  { href: "/plus/autoreply", icon: "↩", nameKey: "plus.index.feat.autoreply", descKey: "plus.index.feat.autoreply.desc" },
  { href: "/plus/analytics", icon: "▲", nameKey: "plus.index.feat.analytics", descKey: "plus.index.feat.analytics.desc" },
  { href: "/plus/apikeys", icon: "⚿", nameKey: "plus.index.feat.apikeys", descKey: "plus.index.feat.apikeys.desc" },
  { href: "/plus/contacts", icon: "◑", nameKey: "plus.index.feat.contacts", descKey: "plus.index.feat.contacts.desc" },
  { href: "/plus/mcp", icon: "⬡", nameKey: "plus.index.feat.mcp", descKey: "plus.index.feat.mcp.desc" },
  { href: "/plus/engines", icon: "◈", nameKey: "plus.index.feat.engines", descKey: "plus.index.feat.engines.desc" },
  { href: "/plus/skills", icon: "✧", nameKey: "plus.index.feat.skills", descKey: "plus.index.feat.skills.desc" },
];

async function loadStats() {
  statsError.value = false;
  try {
    const [sched, tmpl, rules] = await Promise.allSettled([
      get<unknown[]>("/api/schedule"),
      get<unknown[]>("/api/templates"),
      get<unknown[]>("/api/autoreply"),
    ]);
    if (sched.status === "fulfilled")
      stats.scheduled = (sched.value as unknown[]).length;
    if (tmpl.status === "fulfilled")
      stats.templates = (tmpl.value as unknown[]).length;
    if (rules.status === "fulfilled")
      stats.rules = (rules.value as unknown[]).length;
    if (sched.status === "rejected" && tmpl.status === "rejected" && rules.status === "rejected") {
      statsError.value = true;
    }
  } catch {
    statsError.value = true;
  }
}

onMounted(loadStats);
</script>

<style scoped>
.stats-row {
  margin-bottom: 8px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.feature-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 22px;
  text-decoration: none;
  transition:
    border-color 0.2s,
    transform 0.2s;
  display: block;
}

.feature-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 26px;
  margin-bottom: 10px;
}

.feature-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}

.feature-desc {
  font-size: 12px;
  color: var(--text-dim);
  line-height: 1.5;
}
</style>
