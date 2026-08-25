import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installNuxtGlobals } from "./helpers/nuxt-globals";

//
// useWahaRealtime keeps connection state in module-level singletons
// (socket / retryDelay / reconnectTimer), so every case imports a FRESH
// module instance via vi.resetModules().
//

interface FakeSocketEvents {
  onopen: (() => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

class FakeWebSocket implements FakeSocketEvents {
  static instances: FakeWebSocket[] = [];

  url: string;
  readyState = 0;
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  message(data: unknown) {
    this.onmessage?.({
      data: typeof data === "string" ? data : JSON.stringify(data),
    });
  }

  close() {
    if (!this.closed) {
      this.closed = true;
      this.readyState = 3;
      this.onclose?.();
    }
  }
}

// Deterministic setTimeout replacement: records delays so the capped-backoff
// sequence can be asserted exactly, and lets us fire callbacks manually.
function recordTimers() {
  const pending = new Map<number, { fn: () => void; delay: number }>();
  let nextId = 1;
  vi.stubGlobal(
    "setTimeout",
    ((fn: () => void, delay?: number) => {
      const id = nextId++;
      pending.set(id, { fn, delay: delay ?? 0 });
      return id;
    }) as unknown as typeof setTimeout,
  );
  vi.stubGlobal(
    "clearTimeout",
    ((id: number) => {
      pending.delete(id as number);
    }) as unknown as typeof clearTimeout,
  );
  return {
    pending,
    delays: () => [...pending.values()].map((t) => t.delay),
    fireAll: () => {
      const entries = [...pending.values()];
      pending.clear();
      for (const t of entries) t.fn();
    },
  };
}

function stubWindow(protocol = "https:", host = "waha.example.com") {
  const location = { protocol, host, origin: `${protocol}//${host}`, href: "" };
  vi.stubGlobal("window", { location });
  return location;
}

async function freshRealtime(apiKey: string | null) {
  const state = installNuxtGlobals();
  if (apiKey !== null) state.setState("waha_api_key", apiKey);
  vi.stubGlobal("WebSocket", FakeWebSocket);
  const mod = await import("../composables/useWahaRealtime");
  return { mod, state };
}

beforeEach(() => {
  vi.resetModules();
  FakeWebSocket.instances = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("connection lifecycle", () => {
  it("creates a single shared WebSocket across repeated ensureConnected calls", async () => {
    stubWindow();
    const { mod } = await freshRealtime("key-1");
    const rt = mod.useWahaRealtime();

    rt.ensureConnected();
    rt.ensureConnected();
    expect(FakeWebSocket.instances).toHaveLength(1);

    // A second composable instance shares the same singleton socket.
    mod.useWahaRealtime().ensureConnected();
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("builds a wss:// URL on https with session/events/x-api-key query params", async () => {
    stubWindow("https:", "waha.example.com");
    const { mod } = await freshRealtime("k&+/=");
    mod.useWahaRealtime().ensureConnected();

    expect(FakeWebSocket.instances[0].url).toBe(
      "wss://waha.example.com/ws?session=*&events=session.status&x-api-key=k%26%2B%2F%3D",
    );
  });

  it("downgrades to ws:// over plain http", async () => {
    stubWindow("http:", "localhost:3000");
    const { mod } = await freshRealtime("abc");
    mod.useWahaRealtime().ensureConnected();

    expect(FakeWebSocket.instances[0].url).toBe(
      "ws://localhost:3000/ws?session=*&events=session.status&x-api-key=abc",
    );
  });

  it("does not connect while the API key is still loading and retries shortly", async () => {
    stubWindow();
    const timers = recordTimers();
    const { mod, state } = await freshRealtime(null); // key not yet fetched
    mod.useWahaRealtime().ensureConnected();

    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(timers.delays()).toEqual([1000]);

    // Key arrives, retry fires -> real connection attempt happens.
    state.setState("waha_api_key", "late-key");
    timers.fireAll();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(timers.pending.size).toBe(0);
  });

  it("tracks the connected flag through open/close and schedules one retry per drop", async () => {
    stubWindow();
    const timers = recordTimers();
    const { mod } = await freshRealtime("k");
    const rt = mod.useWahaRealtime();
    rt.ensureConnected();
    const sock = FakeWebSocket.instances[0];

    expect(rt.connected.value).toBe(false);
    sock.open();
    expect(rt.connected.value).toBe(true);

    sock.close();
    expect(rt.connected.value).toBe(false);
    expect(timers.pending.size).toBe(1);
  });
});

describe("event handling", () => {
  interface StatusEvt {
    session?: string;
    status?: string;
    payload?: { session?: string; status?: string };
  }

  it.each([
    [
      "the payload.status shape",
      { event: "session.status", session: "prod", payload: { status: "WORKING" } },
      "prod",
      "WORKING",
    ],
    [
      "the top-level status fallback",
      { session: "prod", status: "CONNECTED" },
      "prod",
      "CONNECTED",
    ],
    [
      "a payload-only session name",
      { payload: { session: "fallback-ses", status: "FAILED" } },
      "fallback-ses",
      "FAILED",
    ],
  ])(
    "parses %s into the shared statuses store",
    async (_name, evt: StatusEvt, session, status) => {
      stubWindow();
      const { mod } = await freshRealtime("k");
      const rt = mod.useWahaRealtime();
      rt.ensureConnected();
      FakeWebSocket.instances[0].message(evt);

      expect(rt.liveStatus(session, "UNKNOWN")).toBe(status);
      expect(rt.lastEventAt.value).toBeGreaterThan(0);
    },
  );

  it("ignores malformed JSON and events without session/status", async () => {
    stubWindow();
    const { mod } = await freshRealtime("k");
    const rt = mod.useWahaRealtime();
    rt.ensureConnected();
    const sock = FakeWebSocket.instances[0];

    sock.message("{not json");
    sock.message({ payload: { status: "WORKING" } }); // no session anywhere
    sock.message({ session: "prod" }); // no status
    sock.message({ session: "", status: "WORKING" });

    expect(rt.liveStatus("prod", "FALLBACK")).toBe("FALLBACK");
    expect([...rt.alerts.value]).toEqual([]);
  });

  it("derives alerts only from FAILED and SCAN_QR_CODE statuses", async () => {
    stubWindow();
    const { mod } = await freshRealtime("k");
    const rt = mod.useWahaRealtime();
    rt.ensureConnected();
    const sock = FakeWebSocket.instances[0];

    sock.message({ session: "a", payload: { status: "FAILED" } });
    sock.message({ session: "b", payload: { status: "SCAN_QR_CODE" } });
    sock.message({ session: "c", payload: { status: "WORKING" } });

    expect([...rt.alerts.value]).toEqual([
      { session: "a", kind: "FAILED" },
      { session: "b", kind: "SCAN_QR_CODE" },
    ]);
  });
});

describe("reconnect backoff", () => {
  it("grows x1.5 per failed attempt and caps at 30s", async () => {
    stubWindow();
    const timers = recordTimers();
    const { mod } = await freshRealtime("k");
    mod.useWahaRealtime().ensureConnected();

    const observedDelays: number[] = [];
    for (let cycle = 0; cycle < 10; cycle++) {
      FakeWebSocket.instances[FakeWebSocket.instances.length - 1].close();
      observedDelays.push(timers.delays()[0]);
      timers.fireAll(); // triggers the scheduled reconnect -> new socket
    }

    // 2000ms base, *1.5 growth, clamped at 30_000ms.
    const expected = [
      2000, 3000, 4500, 6750, 10125, 15187.5, 22781.25, 30000, 30000, 30000,
    ];
    expect(observedDelays).toEqual(expected);
    // Every cycle produced exactly one fresh connection attempt.
    expect(FakeWebSocket.instances).toHaveLength(11);
  });

  it("resets the backoff to 2s once a connection succeeds again", async () => {
    stubWindow();
    const timers = recordTimers();
    const { mod } = await freshRealtime("k");
    mod.useWahaRealtime().ensureConnected();

    // Two failed cycles push retryDelay to 4500.
    FakeWebSocket.instances[0].close();
    timers.fireAll();
    FakeWebSocket.instances[1].close();
    timers.fireAll();

    // This attempt SUCCEEDS -> internal delay resets.
    FakeWebSocket.instances[2].open();
    FakeWebSocket.instances[2].close();

    expect(timers.delays()).toEqual([2000]);
  });

  it("schedules the default delay when the WebSocket constructor throws", async () => {
    stubWindow();
    const timers = recordTimers();
    const { mod } = await freshRealtime("k");
    // Override AFTER freshRealtime so this throwing class, not FakeWebSocket,
    // is what connect() instantiates.
    vi.stubGlobal(
      "WebSocket",
      class {
        constructor() {
          throw new Error("no sockets today");
        }
      },
    );
    mod.useWahaRealtime().ensureConnected();

    expect(timers.delays()).toEqual([2000]);
  });
});

describe("list integration helpers", () => {
  it("applyTo overrides WS-known statuses and copies otherwise-untouched entries", async () => {
    stubWindow();
    const { mod } = await freshRealtime("k");
    const rt = mod.useWahaRealtime();
    rt.ensureConnected();
    FakeWebSocket.instances[0].message({
      session: "prod",
      payload: { status: "FAILED" },
    });

    const list = [
      { name: "prod", status: "LAUNCHING", extra: 1 },
      { name: "other", status: "WORKING", extra: 2 },
    ];
    const merged = rt.applyTo(list);
    expect(merged[0]).toEqual({ name: "prod", status: "FAILED", extra: 1 });
    expect(merged[1]).toEqual({ name: "other", status: "WORKING", extra: 2 });
    // Copy-on-write: original list untouched.
    expect(list[0].status).toBe("LAUNCHING");
  });

  it("applyTo short-circuits to the same list when the store is empty", async () => {
    stubWindow();
    const { mod } = await freshRealtime("k");
    const rt = mod.useWahaRealtime();
    const list = [{ name: "a", status: "WORKING" }];
    expect(rt.applyTo(list)).toBe(list);
  });
});
