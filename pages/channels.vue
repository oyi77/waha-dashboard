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
          />
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
          />
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

const { get, post } = useWahaApi();
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
let cursor: string | null = null;

const workingSessions = computed(() =>
  sessions.value.filter((s) => s.status === "WORKING").map((s) => s.name),
);

const searchReady = computed(() =>
  mode.value === "text"
    ? searchText.value.trim().length > 0
    : searchView.value !== "",
);

const hasMore = computed(() => cursor !== null && cursor !== "");

watch(sessionName, () => {
  if (sessionName.value) {
    loadCatalogs();
    if (tabValue.value === "mine") loadMine();
  }
});

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
  if (searchCountry.value) body.countryCode = searchCountry.value;
  if (searchCategory.value) body.categories = [searchCategory.value];
  return body;
}

async function runSearch() {
  searching.value = true;
  searched.value = true;
  cursor = null;
  try {
    const res = await post<{ channels?: Channel[]; nextStartCursor?: string | null }>(
      `/api/${sessionName.value}/channels/search/${mode.value === "text" ? "by-text" : "by-view"}`,
      searchBody(20),
    );
    results.value = res.channels ?? [];
    cursor = res.nextStartCursor ?? null;
  } catch (e) {
    error("Search failed: " + extractApiError(e));
    results.value = [];
  } finally {
    searching.value = false;
  }
}

async function loadMore() {
  if (!cursor) return;
  searching.value = true;
  try {
    const body = { ...searchBody(20), startCursor: cursor };
    const res = await post<{ channels?: Channel[]; nextStartCursor?: string | null }>(
      `/api/${sessionName.value}/channels/search/${mode.value === "text" ? "by-text" : "by-view"}`,
      body,
    );
    results.value = [...results.value, ...(res.channels ?? [])];
    cursor = res.nextStartCursor ?? null;
  } catch (e) {
    error("Failed to load more: " + extractApiError(e));
  } finally {
    searching.value = false;
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
</style>
