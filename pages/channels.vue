<template>
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <div class="page-title">📢 Channels</div>
        <div class="page-subtitle">Explore and manage WhatsApp channels</div>
      </div>
      <select v-model="sessionName" class="session-select" aria-label="Session">
        <option value="" disabled>— session —</option>
        <option v-for="s in workingSessions" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <div v-if="!sessionName" class="empty-state">
      <div class="empty-state-icon">📢</div>
      <div class="empty-state-text">Select a WORKING session to browse channels.</div>
    </div>

    <template v-else>
      <div class="filter-bar">
        <div class="filter-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: tabValue === tab.value }"
            @click="switchTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- My Channels -->
      <template v-if="tabValue === 'mine'">
        <div v-if="loading" class="empty-state">
          <div class="empty-state-icon">⟳</div>
          <div class="empty-state-text">Loading channels...</div>
        </div>
        <div v-else-if="channels.length === 0" class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">This session follows no channels.</div>
        </div>
        <div v-else class="channels-grid stagger">
          <ChannelCard
            v-for="ch in channels"
            :key="ch.id"
            :channel="ch"
            @click="openPreview(ch)"
          >
            <template #actions>
              <button
                class="btn-ghost"
                :title="muted.has(ch.id) ? 'Unmute channel' : 'Mute channel'"
                @click.stop="toggleMute(ch)"
              >
                {{ muted.has(ch.id) ? "🔔 Unmute" : "🔕 Mute" }}
              </button>
              <button
                class="btn-danger"
                @click.stop="confirmUnfollow(ch)"
              >
                ✕ Unfollow
              </button>
            </template>
          </ChannelCard>
        </div>
      </template>

      <!-- Discover -->
      <template v-else>
        <div class="discover-controls card">
          <div class="discover-modes">
            <button
              class="filter-tab"
              :class="{ active: mode === 'view' }"
              @click="mode = 'view'"
            >
              By View
            </button>
            <button
              class="filter-tab"
              :class="{ active: mode === 'text' }"
              @click="mode = 'text'"
            >
              By Text
            </button>
          </div>

          <div v-if="mode === 'text'" class="discover-row">
            <input
              v-model="searchText"
              placeholder="Search channels by keyword..."
              type="search"
              @keydown.enter="runSearch"
            />
          </div>

          <div v-else class="discover-row">
            <select v-model="searchView" aria-label="View">
              <option value="" disabled>— view —</option>
              <option v-for="v in views" :key="v.value" :value="v.value">
                {{ v.name }}
              </option>
            </select>
            <select v-model="searchCountry" aria-label="Country">
              <option value="">🌍 Any country</option>
              <option v-for="c in countries" :key="c.code" :value="c.code">
                {{ c.name }}
              </option>
            </select>
            <select v-model="searchCategory" aria-label="Category">
              <option value="">🗂 Any category</option>
              <option v-for="c in categories" :key="c.value" :value="c.value">
                {{ c.name }}
              </option>
            </select>
          </div>

          <div class="discover-actions">
            <button
              class="btn-primary"
              :disabled="searching || !searchReady"
              @click="runSearch"
            >
              {{ searching ? "⟳ Searching..." : "🔎 Search" }}
            </button>
          </div>
        </div>

        <div v-if="results.length > 0" class="channels-grid stagger">
          <ChannelCard
            v-for="ch in results"
            :key="ch.id"
            :channel="ch"
            @click="openPreview(ch)"
          >
            <template #actions>
              <button
                class="btn-primary"
                :disabled="following === ch.id"
                @click.stop="followChannel(ch)"
              >
                {{ following === ch.id ? "⟳ ..." : "+ Follow" }}
              </button>
            </template>
          </ChannelCard>
        </div>

        <div v-if="hasMore" style="display: flex; justify-content: center; margin: 20px 0">
          <button class="btn-secondary" :disabled="searching" @click="loadMore">
            Load more
          </button>
        </div>

        <div
          v-if="!searching && searched && results.length === 0"
          class="empty-state"
        >
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-text">No channels found for this search.</div>
        </div>
      </template>

      <!-- Unfollow Confirm Modal -->
      <div
        v-if="unfollowTarget"
        class="modal-overlay"
        @click.self="unfollowTarget = null"
        @keydown.escape="unfollowTarget = null"
      >
        <div class="modal-box" tabindex="-1">
          <div class="modal-title">✕ Unfollow</div>
          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px">
            Unfollow "{{ unfollowTarget.name }}"?
          </p>
          <div style="display: flex; gap: 10px">
            <button class="btn-ghost" style="flex: 1" @click="unfollowTarget = null">
              Cancel
            </button>
            <button class="btn-danger" style="flex: 1" @click="doUnfollow">
              ✕ Unfollow
            </button>
          </div>
        </div>
      </div>

      <!-- Channel Preview Modal -->
      <div
        v-if="previewChannel"
        class="modal-overlay"
        @click.self="previewChannel = null"
        @keydown.escape="previewChannel = null"
      >
        <div class="modal-box" tabindex="-1" style="max-width: 560px">
          <div class="modal-title">
            📢 {{ previewChannel.name }}
            <span v-if="previewChannel.verified" style="color: var(--info)">✓</span>
          </div>
          <div v-if="previewLoading" class="empty-state-text" style="padding: 24px 0">
            ⟳ Loading messages...
          </div>
          <div v-else-if="previewMessages.length === 0" class="status-empty">
            No recent messages available.
          </div>
          <div v-else class="preview-list">
            <div
              v-for="(msg, i) in previewMessages"
              :key="i"
              class="preview-msg card"
            >
              <div class="preview-meta">
                <span>{{ formatTime(msg.timestamp) }}</span>
                <span>👁 {{ msg.viewCount }}</span>
                <span v-if="reactionSummary(msg)">💬 {{ reactionSummary(msg) }}</span>
              </div>
              <div class="preview-text">{{ msg.text }}</div>
            </div>
          </div>
          <button
            class="btn-ghost"
            style="margin-top: 16px; width: 100%"
            @click="previewChannel = null"
          >
            Close
          </button>
        </div>
      </div>
    </template>
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
interface CatalogItem {
  value: string;
  name: string;
}
interface CountryItem {
  code: string;
  name: string;
}

const { get, post, del } = useWahaApi();
const { error } = useToast();

const tabs = [
  { label: "My Channels", value: "mine" },
  { label: "Discover", value: "discover" },
];
const tabValue = ref("mine");
const mode = ref<"view" | "text">("view");

const sessions = ref<{ name: string; status: string }[]>([]);
const sessionName = ref("");

const channels = ref<Channel[]>([]);
const loading = ref(false);

const views = ref<CatalogItem[]>([]);
const countries = ref<CountryItem[]>([]);
const categories = ref<CatalogItem[]>([]);

const searchText = ref("");
const searchView = ref("");
const searchCountry = ref("");
const searchCategory = ref("");
const searching = ref(false);
const searched = ref(false);
const results = ref<Channel[]>([]);
const cursor = ref<string | null>(null);
const muted = ref<Set<string>>(new Set());
const following = ref<string | null>(null);

// Preview modal
interface ChannelMessageView {
  text: string;
  timestamp: number | null;
  viewCount: number;
  reactions: Record<string, number>;
}
const previewChannel = ref<Channel | null>(null);
const previewLoading = ref(false);
const previewMessages = ref<ChannelMessageView[]>([]);

const workingSessions = computed(() =>
  sessions.value.filter((s) => s.status === "WORKING").map((s) => s.name),
);

const searchReady = computed(() =>
  mode.value === "text"
    ? searchText.value.trim().length > 0
    : searchView.value !== "",
);

const hasMore = computed(() => cursor.value !== null && cursor.value !== "");

watch(sessionName, () => {
  if (sessionName.value) {
    loadCatalogs();
    if (tabValue.value === "mine") loadMine();
  }
});
interface ChannelSearchResult {
  page?: {
    endCursor?: string | null;
    hasNextPage?: boolean;
  };
  channels?: Channel[];
}


function switchTab(value: string) {
  tabValue.value = value;
  if (value === "mine") loadMine();
}

async function loadMine() {
  loading.value = true;
  try {
    channels.value = await get<Channel[]>(
      `/api/${sessionName.value}/channels`,
    );
  } catch (e) {
    error("Failed to load channels: " + extractApiError(e));
  } finally {
    loading.value = false;
  }
}

async function loadCatalogs() {
  const base = `/api/${sessionName.value}/channels/search`;
  const [v, c, cat] = await Promise.allSettled([
    get<CatalogItem[]>(`${base}/views`),
    get<CountryItem[]>(`${base}/countries`),
    get<CatalogItem[]>(`${base}/categories`),
  ]);
  if (v.status === "fulfilled") views.value = v.value;
  if (c.status === "fulfilled") countries.value = c.value;
  if (cat.status === "fulfilled") categories.value = cat.value;
}

function searchBody(limit: number): Record<string, unknown> {
  if (mode.value === "text") {
    return { text: searchText.value.trim(), limit };
  }
  const body: Record<string, unknown> = {
    view: searchView.value,
    limit,
  };
  if (searchCountry.value) body.countries = [searchCountry.value];
  if (searchCategory.value) body.categories = [searchCategory.value];
  return body;
}

async function runSearch() {
  searching.value = true;
  searched.value = true;
  cursor.value = null;
  try {
    const res = await post<ChannelSearchResult>(
      `/api/${sessionName.value}/channels/search/${mode.value === "text" ? "by-text" : "by-view"}`,
      searchBody(20),
    );
    results.value = res.channels ?? [];
    cursor.value = res.page?.hasNextPage ? (res.page.endCursor ?? null) : null;
  } catch (e) {
    error("Search failed: " + extractApiError(e));
    results.value = [];
  } finally {
    searching.value = false;
  }
}

async function loadMore() {
  if (!cursor.value) return;
  searching.value = true;
  try {
    const body = { ...searchBody(20), startCursor: cursor.value };
    const res = await post<ChannelSearchResult>(
      `/api/${sessionName.value}/channels/search/${mode.value === "text" ? "by-text" : "by-view"}`,
      body,
    );
    results.value = [...results.value, ...(res.channels ?? [])];
    cursor.value = res.page?.hasNextPage ? (res.page.endCursor ?? null) : null;
  } catch (e) {
    error("Failed to load more: " + extractApiError(e));
  } finally {
    searching.value = false;
  }
}

function extractMessageText(m: any): string {
  const ext = m?.message?.extendedTextMessage ?? m?.message?.conversation ??
    m?.message?.imageMessage ?? m?.message?.videoMessage ?? m?.message;
  return String(
    ext?.text ?? ext?.caption ?? m?.message?.documentMessage?.title ?? "",
  ).slice(0, 400);
}

async function openPreview(ch: Channel) {
  if (!ch.invite && !ch.id) return;
  previewChannel.value = ch;
  previewLoading.value = true;
  previewMessages.value = [];
  try {
    const idOrCode = ch.invite || ch.id;
    const msgs = await get<
      { message: any; viewCount?: number; reactions?: Record<string, number> }[]
    >(
      `/api/${sessionName.value}/channels/${encodeURIComponent(idOrCode)}/messages/preview?limit=10`,
    );
    previewMessages.value = (msgs ?? []).map((m) => ({
      text: extractMessageText(m.message) || "(media message)",
      timestamp: m.message?.messageTimestamp ?? null,
      viewCount: m.viewCount ?? 0,
      reactions: m.reactions ?? {},
    }));
  } catch (e) {
    error("Failed to load messages: " + extractApiError(e));
  } finally {
    previewLoading.value = false;
  }
}

function formatTime(unix: number | null): string {
  if (!unix) return "-";
  const ms = unix > 1e12 ? unix : unix * 1000;
  return new Date(ms).toLocaleString();
}

function reactionSummary(reactions: Record<string, number>): string {
  return Object.entries(reactions)
    .filter(([, n]) => n > 0)
    .map(([emoji, n]) => `${emoji}${n}`)
    .join(" ");
}

async function followChannel(ch: Channel) {
  following.value = ch.id;
  try {
    await post(`/api/${sessionName.value}/channels/${encodeURIComponent(ch.id)}/follow`);
    channels.value = [ch, ...channels.value.filter((c) => c.id !== ch.id)];
    results.value = results.value.filter((c) => c.id !== ch.id);
    success(`✅ Followed "${ch.name}"`);
  } catch (e) {
    error("Follow failed: " + extractApiError(e));
  } finally {
    following.value = null;
  }
}

const unfollowTarget = ref<Channel | null>(null);

function confirmUnfollow(ch: Channel) {
  unfollowTarget.value = ch;
}

async function doUnfollow() {
  const ch = unfollowTarget.value;
  if (!ch) return;
  unfollowTarget.value = null;
  try {
    await del(`/api/${sessionName.value}/channels/${encodeURIComponent(ch.id)}`);
    channels.value = channels.value.filter((c) => c.id !== ch.id);
    success(`Unfollowed "${ch.name}"`);
  } catch (e) {
    error("Unfollow failed: " + extractApiError(e));
  }
}

async function toggleMute(ch: Channel) {
  const action = muted.value.has(ch.id) ? "unmute" : "mute";
  try {
    await post(`/api/${sessionName.value}/channels/${encodeURIComponent(ch.id)}/${action}`);
    const next = new Set(muted.value);
    if (action === "mute") next.add(ch.id);
    else next.delete(ch.id);
    muted.value = next;
    success(action === "mute" ? "🔕 Muted" : "🔔 Unmuted");
  } catch (e) {
    error(`${action} failed: ` + extractApiError(e));
  }
}

onMounted(async () => {
  try {
    const data = await get<{ name: string; status: string }[]>("/api/sessions?all=true");
    sessions.value = data;
    const working = data.filter((s) => s.status === "WORKING");
    if (working.length === 1) {
      // Auto-pick when there is exactly one usable session
      sessionName.value = working[0].name;
    }
  } catch {
    // Session list failures surface through the empty state
  }
});
</script>

<style scoped>
.session-select {
  max-width: 260px;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.discover-controls {
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.discover-modes {
  display: flex;
  gap: 6px;
}

.discover-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.discover-actions {
  display: flex;
  justify-content: flex-end;
}

/* Channel preview modal */

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 50vh;
  overflow-y: auto;
}

.preview-msg {
  padding: 10px 12px;
}

.preview-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 6px;
}

.preview-text {
  font-size: 13px;
  color: var(--text-body);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
