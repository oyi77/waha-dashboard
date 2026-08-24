// Realtime session-status store backed by the WAHA WebSocket gateway (/ws).
//
// - Single shared connection for the whole app (singleton state via useState)
// - Auth: x-api-key query param resolved from useWahaApi config
// - Auto-reconnect with capped backoff; falls back silently when WS is
//   unavailable so polling pages keep working as before
// - Exposes reactive per-session statuses + derived alert list

export interface WahaStatusEvent {
  event?: string;
  session?: string;
  payload?: { status?: string } | null;
  status?: string;
}

export interface SessionAlert {
  session: string;
  kind: "FAILED" | "SCAN_QR_CODE";
}

const statuses = useState<Record<string, string>>("waha_rt_statuses", () => ({}));
const connected = useState<boolean>("waha_rt_connected", () => false);
const lastEventAt = useState<number>("waha_rt_last_event", () => 0);

let socket: WebSocket | null = null;
let retryDelay = 2000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function wsUrl(): string | null {
  if (typeof window === "undefined") return null;
  const cfgKey = useState<string>("waha_api_key");
  const key = cfgKey.value;
  if (!key) return null;
  const proto = window.location.protocol === "https:" ? "wss://" : "ws://";
  return `${proto}${window.location.host}/ws?session=*&events=session.status&x-api-key=${encodeURIComponent(key)}`;
}

function handleEvent(raw: string) {
  let evt: WahaStatusEvent;
  try {
    evt = JSON.parse(raw);
  } catch {
    return;
  }
  const name = evt.session || (evt.payload as any)?.session;
  const status = evt.payload?.status ?? evt.status;
  if (!name || !status) return;
  statuses.value = { ...statuses.value, [name]: status };
  lastEventAt.value = Date.now();
}

function connect() {
  if (typeof window === "undefined") return;
  const url = wsUrl();
  if (!url) {
    // API key not loaded yet — retry shortly
    scheduleReconnect(1000);
    return;
  }
  try {
    socket = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }
  socket.onopen = () => {
    connected.value = true;
    retryDelay = 2000;
  };
  socket.onmessage = (msg) => handleEvent(String(msg.data));
  socket.onclose = () => {
    connected.value = false;
    socket = null;
    scheduleReconnect();
  };
  socket.onerror = () => {
    try {
      socket?.close();
    } catch {
      /* noop */
    }
  };
}

function scheduleReconnect(delay?: number) {
  if (typeof window === "undefined") return;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const wait = delay ?? Math.min(retryDelay, 30_000);
  retryDelay = Math.min(retryDelay * 1.5, 30_000);
  reconnectTimer = setTimeout(connect, wait);
}

export function useWahaRealtime() {
  function ensureConnected() {
    if (socket || typeof window === "undefined") return;
    connect();
  }

  // Live status for a session: WS value wins, caller supplies fallback
  function liveStatus(name: string, fallback: string): string {
    return statuses.value[name] ?? fallback;
  }

  function applyTo<T extends { name: string; status: string }>(list: T[]): T[] {
    if (Object.keys(statuses.value).length === 0) return list;
    return list.map((s) =>
      statuses.value[s.name] ? { ...s, status: statuses.value[s.name] } : s,
    );
  }

  const alerts = computed<SessionAlert[]>(() =>
    Object.entries(statuses.value)
      .filter(([, st]) => st === "FAILED" || st === "SCAN_QR_CODE")
      .map(([session, st]) => ({
        session,
        kind: st as SessionAlert["kind"],
      })),
  );

  return { connected, lastEventAt, alerts, liveStatus, applyTo, ensureConnected };
}
