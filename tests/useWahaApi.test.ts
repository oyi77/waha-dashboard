import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { installNuxtGlobals } from "./helpers/nuxt-globals";

const ORIGIN = "https://waha.example.com";

function stubWindow() {
  const location: {
    protocol: string;
    host: string;
    origin: string;
    href: string;
  } = {
    protocol: "https:",
    host: "waha.example.com",
    origin: ORIGIN,
    href: `${ORIGIN}/dashboard/`,
  };
  vi.stubGlobal("window", { location });
  return location;
}

// Fresh module instance per test: useWahaApi keeps module-level singletons
// (apiKey refs + initPromise) that must not leak across cases.
// Dynamic import is intentional (module-loading boundary under test): the
// module body calls auto-imported useState() at top level, which requires the
// global stubs from installNuxtGlobals() to exist first, and vi.resetModules()
// gives every case a fresh copy of the apiKey/initPromise singletons.
async function freshApi($fetch: Mock) {
  installNuxtGlobals();
  vi.stubGlobal("$fetch", $fetch);
  return await import("../composables/useWahaApi");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useWahaApi init", () => {
  it("lazy-loads the API key from /api/dashboard/config exactly once", async () => {
    stubWindow();
    const $fetch = vi
      .fn()
      .mockResolvedValueOnce({ apiKey: "secret-key", baseUrl: ORIGIN })
      .mockResolvedValue({ ok: true });

    const { useWahaApi } = await freshApi($fetch);
    const api = useWahaApi();

    // Before init: no key, no auth headers, config endpoint untouched.
    expect(api.apiKey.value).toBe("");
    expect(api.headers()).toEqual({});
    expect($fetch).not.toHaveBeenCalled();

    await api.init();
    expect($fetch).toHaveBeenCalledTimes(1);
    const [configUrl, configOpts] = $fetch.mock.calls[0];
    expect(configUrl).toBe(`${ORIGIN}/api/dashboard/config`);
    expect(configOpts).toMatchObject({ credentials: "same-origin" });
    expect(api.apiKey.value).toBe("secret-key");
    expect(api.baseUrl.value).toBe(ORIGIN);

    // A subsequent request must NOT re-fetch the config (init short-circuit).
    await api.get("/api/sessions");
    expect($fetch).toHaveBeenCalledTimes(2);
    expect($fetch.mock.calls[1][0]).toBe(`${ORIGIN}/api/sessions`);
  });

  it("redirects to the login page when the config endpoint returns 401", async () => {
    const location = stubWindow();
    const unauthorized = Object.assign(new Error("Unauthorized"), {
      status: 401,
    });
    const $fetch = vi.fn().mockRejectedValue(unauthorized);

    const { useWahaApi } = await freshApi($fetch);
    const api = useWahaApi();
    await api.init();

    expect(location.href).toBe("/dashboard/login.html");
    expect(api.apiKey.value).toBe("");
  });

  it("survives non-401 config failures without a key instead of crashing", async () => {
    stubWindow();
    const boom = Object.assign(new Error("network down"), { status: 500 });
    const $fetch = vi.fn().mockRejectedValueOnce(boom);

    const { useWahaApi } = await freshApi($fetch);
    const api = useWahaApi();
    await expect(api.init()).resolves.toBeUndefined();
    expect(api.apiKey.value).toBe("");
    expect(api.baseUrl.value).toBe(ORIGIN);
  });
});

describe("useWahaApi requests", () => {
  function mockWithKey() {
    return vi
      .fn()
      .mockResolvedValueOnce({ apiKey: "k-123", baseUrl: ORIGIN })
      .mockResolvedValue({ ok: true });
  }

  it("injects X-Api-Key into get/post/put/del and passes bodies through", async () => {
    stubWindow();
    const $fetch = mockWithKey();
    const { useWahaApi } = await freshApi($fetch);
    const api = useWahaApi();

    await api.get("/api/sessions");
    await api.post("/api/sessions/start", { session: "prod" });
    await api.put("/api/sessions/prod", { presence: "available" });
    await api.del("/api/sessions/old");

    const calls = $fetch.mock.calls.slice(1);
    expect(
      calls.map(([url, opts]) => [
        url,
        (opts as { method?: string }).method ?? undefined,
      ]),
    ).toEqual([
      [`${ORIGIN}/api/sessions`, undefined],
      [`${ORIGIN}/api/sessions/start`, "POST"],
      [`${ORIGIN}/api/sessions/prod`, "PUT"],
      [`${ORIGIN}/api/sessions/old`, "DELETE"],
    ]);

    for (const [, opts] of calls) {
      expect((opts as { headers: Record<string, string> }).headers).toEqual({
        "X-Api-Key": "k-123",
      });
    }
    expect(($fetch.mock.calls[2][1] as { body: unknown }).body).toEqual({
      session: "prod",
    });
    expect(($fetch.mock.calls[3][1] as { body: unknown }).body).toEqual({
      presence: "available",
    });
  });

  it("merges extra headers and options without dropping the auth header", async () => {
    stubWindow();
    const $fetch = mockWithKey();
    const { useWahaApi } = await freshApi($fetch);
    const api = useWahaApi();

    await api.get("/api/contacts?l=10", {
      params: { l: 10 },
      headers: { "X-Custom": "1" },
    });

    const opts = $fetch.mock.calls[1][1] as Record<string, unknown>;
    expect(opts.headers).toEqual({ "X-Api-Key": "k-123", "X-Custom": "1" });
    // Non-header extras must survive the merge.
    expect(opts.params).toEqual({ l: 10 });
  });

  it("exposes Bearer credentials via authHeaders for non-header consumers", async () => {
    stubWindow();
    const $fetch = mockWithKey();
    const { useWahaApi } = await freshApi($fetch);
    const api = useWahaApi();

    expect(api.authHeaders()).toEqual({});
    await api.init();
    expect(api.authHeaders()).toEqual({ Authorization: "Bearer k-123" });
  });

  it("uses relative URLs when window is unavailable (SSR-safe)", async () => {
    // No window stub in this test.
    const $fetch = vi
      .fn()
      .mockResolvedValueOnce({ apiKey: "k", baseUrl: "" })
      .mockResolvedValue([]);

    const { useWahaApi } = await freshApi($fetch);
    const api = useWahaApi();
    await api.get("/api/sessions");

    expect($fetch.mock.calls[0][0]).toBe("/api/dashboard/config");
    expect($fetch.mock.calls[1][0]).toBe("/api/sessions");
  });
});

describe("plus-tier 403 handling", () => {
  function plusError() {
    return Object.assign(new Error("[GET /api/x] Forbidden"), {
      status: 403,
      response: {
        status: 403,
        _data: {
          message:
            "[403] AvailableInPlusVersion[] - This feature is available only in WAHA Plus",
          statusCode: 403,
        },
      },
    });
  }

  it("translates an AvailableInPlusVersion 403 into a friendly Plus error (get)", async () => {
    stubWindow();
    const $fetch = vi.fn().mockResolvedValueOnce({ apiKey: "k" }).mockRejectedValueOnce(plusError());

    const { useWahaApi } = await freshApi($fetch);
    const api = useWahaApi();
    await expect(api.get("/api/channels")).rejects.toThrow(
      "This feature requires WAHA Plus",
    );
  });

  it("applies the same translation to post/put/del", async () => {
    stubWindow();
    for (const verb of ["post", "put", "del"] as const) {
      vi.resetModules();
      const $fetch = vi
        .fn()
        .mockResolvedValueOnce({ apiKey: "k" })
        .mockRejectedValue(plusError());
      const mod = await freshApi($fetch);
      const api = mod.useWahaApi();
      const call =
        verb === "del"
          ? () => api.del("/api/x")
          : () => (api[verb] as (p: string, b?: unknown) => Promise<unknown>)("/api/x", {});
      await expect(call()).rejects.toThrow("This feature requires WAHA Plus");
    }
  });

  it("rethrows ordinary 403s untouched so callers see the real error", async () => {
    stubWindow();
    const plain403 = Object.assign(new Error("forbidden resource"), {
      status: 403,
      response: { status: 403, _data: { message: "forbidden resource" } },
    });
    const $fetch = vi.fn().mockResolvedValueOnce({ apiKey: "k" }).mockRejectedValue(plain403);

    const { useWahaApi } = await freshApi($fetch);
    const api = useWahaApi();
    await expect(api.get("/api/admin")).rejects.toBe(plain403);
  });
});

describe("extractApiError", () => {
  let extractApiError: (e: unknown) => string;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await freshApi(vi.fn());
    extractApiError = mod.extractApiError;
  });

  it.each([
    [
      "reads NestJS {message,statusCode} from ofetch e.response._data",
      Object.assign(new Error("[GET] 500"), {
        response: { status: 500, _data: { message: "Session not found", statusCode: 500 } },
      }),
      "Session not found",
    ],
    [
      "falls back to e.data.message",
      Object.assign(new Error("wrapped"), {
        data: { message: "Invalid body" },
      }),
      "Invalid body",
    ],
    [
      "returns raw string bodies verbatim",
      Object.assign(new Error("Bad Request"), { response: { _data: "plain text failure" } }),
      "plain text failure",
    ],
    [
      "falls back to e.error field then e.message",
      new Error("socket hang up"),
      "socket hang up",
    ],
    [
      "ends at Unknown error when nothing usable exists",
      {},
      "Unknown error",
    ],
  ])("%s", (_name, err, expected) => {
    expect(extractApiError(err)).toBe(expected);
  });
});
