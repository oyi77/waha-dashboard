import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installNuxtGlobals } from "./helpers/nuxt-globals";

// Dynamic import is intentional (module-loading boundary under test): it lets
// vi.resetModules() hand every case a fresh module instance, resetting both
// the shared useState store and the module-private nextId counter.
async function freshToast() {
  installNuxtGlobals();
  return await import("../composables/useToast");
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useToast lifecycle", () => {
  it("pushes toasts with unique incremental ids", async () => {
    const { useToast } = await freshToast();
    const toast = useToast();

    toast.info("first");
    toast.success("second");
    toast.error("third");

    expect(toast.toasts.value.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(toast.toasts.value.map((t) => t.message)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("maps helper methods to their toast types", async () => {
    const { useToast } = await freshToast();
    const toast = useToast();

    toast.success("ok");
    toast.error("bad");
    toast.info("fyi");

    expect(toast.toasts.value.map((t) => t.type)).toEqual([
      "success",
      "error",
      "info",
    ]);
  });

  it("auto-dismisses info/success after 3.5s and errors after 5s", async () => {
    const { useToast } = await freshToast();
    const toast = useToast();

    toast.info("transient");
    toast.error("sticky");

    vi.advanceTimersByTime(3499);
    expect(toast.toasts.value).toHaveLength(2);

    vi.advanceTimersByTime(1);
    expect(toast.toasts.value.map((t) => t.id)).toEqual([2]);

    vi.advanceTimersByTime(1500);
    expect(toast.toasts.value).toEqual([]);
  });

  it("dismiss() removes exactly the requested toast", async () => {
    const { useToast } = await freshToast();
    const toast = useToast();

    toast.info("a");
    toast.info("b");
    toast.info("c");

    toast.dismiss(2);
    expect(toast.toasts.value.map((t) => t.id)).toEqual([1, 3]);

    // Unknown ids are a no-op.
    toast.dismiss(999);
    expect(toast.toasts.value.map((t) => t.id)).toEqual([1, 3]);
  });

  it("each toast is removed only by its own timer, not a later one", async () => {
    const { useToast } = await freshToast();
    const toast = useToast();

    toast.info("early"); // id 1, gone at 3500ms
    vi.advanceTimersByTime(3000);
    toast.info("late"); // id 2, gone at 6500ms

    vi.advanceTimersByTime(500); // 3500 total for id 1
    expect(toast.toasts.value.map((t) => t.id)).toEqual([2]);

    vi.advanceTimersByTime(3000); // 6500 total for id 2
    expect(toast.toasts.value).toEqual([]);
  });

  it("exposes the list read-only so callers cannot mutate it directly", async () => {
    const { useToast } = await freshToast();
    const toast = useToast();

    toast.info("only");
    const snapshot = [...toast.toasts.value];
    try {
      (toast.toasts.value as unknown as number[]).push(99);
    } catch {
      // Vue may throw on readonly writes depending on build; either way...
    }
    // ...the visible list must be unchanged by outside mutation attempts.
    expect([...toast.toasts.value]).toEqual(snapshot);
    expect(toast.toasts.value).toHaveLength(1);
  });

  it("keeps state keyed globally so separate useToast() calls share one queue", async () => {
    const { useToast } = await freshToast();
    const writer = useToast();
    const reader = useToast();

    writer.success("shared");
    expect(reader.toasts.value.map((t) => t.message)).toEqual(["shared"]);

    reader.dismiss(writer.toasts.value[0].id);
    expect(writer.toasts.value).toEqual([]);
  });
});
