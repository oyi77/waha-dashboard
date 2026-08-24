<template>
  <div class="channel-card card">
    <div class="ch-head">
      <img
        v-if="channel.picture || channel.preview"
        :src="channel.picture || channel.preview"
        :alt="channel.name"
        class="ch-avatar"
        loading="lazy"
        @error="imgFailed = true"
      />
      <div v-else class="ch-avatar ch-fallback">
        {{ (channel.name?.[0] ?? "C").toUpperCase() }}
      </div>
      <div class="ch-meta">
        <div class="ch-name" :title="channel.name">
          {{ channel.name }}
          <span v-if="channel.verified" class="ch-verified" title="Verified">✓</span>
        </div>
        <div v-if="subscribers" class="ch-subs">
          👥 {{ subscribers }} subscribers
        </div>
      </div>
    </div>

    <p v-if="shortDescription" class="ch-desc">{{ shortDescription }}</p>

    <div v-if="channel.invite" class="ch-actions">
      <a
        :href="channel.invite"
        target="_blank"
        rel="noopener noreferrer"
        class="btn-ghost"
        style="text-decoration: none"
      >Open ↗</a>
      <button class="btn-secondary" @click="copyInvite">
        {{ copied ? "✓ Copied" : "Copy invite" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Channel {
  id: string;
  name: string;
  description?: string;
  invite?: string;
  preview?: string;
  picture?: string;
  verified?: boolean;
  subscribersCount?: number;
}

const props = defineProps<{ channel: Channel }>();

const imgFailed = ref(false);
const copied = ref(false);

const subscribers = computed(() => {
  const n = props.channel.subscribersCount;
  return typeof n === "number" && n > 0 ? n.toLocaleString() : "";
});

const shortDescription = computed(() => {
  const d = (props.channel.description ?? "").replace(/\*/g, "").trim();
  return d.length > 140 ? d.slice(0, 137) + "..." : d;
});

async function copyInvite() {
  if (!props.channel.invite) return;
  try {
    await navigator.clipboard.writeText(props.channel.invite);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // Clipboard may be blocked; the Open link remains available
  }
}
</script>

<style scoped>
.channel-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ch-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ch-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--border);
}

.ch-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  background: var(--surface-hover);
}

.ch-meta {
  min-width: 0;
}

.ch-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ch-verified {
  color: var(--info);
  margin-left: 2px;
}

.ch-subs {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 2px;
}

.ch-desc {
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.ch-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}
</style>
