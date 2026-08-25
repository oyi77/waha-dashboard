import { vi } from "vitest";
import { computed, readonly, ref } from "vue";

//
// Minimal stand-in for the Nuxt auto-import surface used by the data-layer
// composables (useWahaApi / useWahaRealtime / useToast). Plain vitest runs
// without the Nuxt build, so `useState` / `computed` / `readonly` resolve as
// bare globals; they must exist BEFORE a composable module is imported
// (useWahaApi calls useState at module scope).
//
// NOTE: consumers MUST dynamically import composable modules AFTER calling
// this installer. Static imports evaluate the module body immediately, and
// e.g. useWahaApi.ts runs useState() at top level — before any global stub
// could exist — so a static import crashes plain vitest.
// Semantics mirror Nuxt: one shared ref per key within an app lifetime.
// Call installNuxtGlobals() again (typically after vi.resetModules()) for a
// fresh "app" with empty state.
//
export function installNuxtGlobals() {
  const stateMap = new Map<string, { value: unknown }>();

  const useState = (key: string, init?: () => unknown) => {
    let entry = stateMap.get(key);
    if (!entry) {
      entry = ref(init ? init() : undefined);
      stateMap.set(key, entry);
    }
    return entry;
  };

  vi.stubGlobal("useState", useState);
  vi.stubGlobal("computed", computed);
  vi.stubGlobal("readonly", readonly);

  return {
    // Seed or overwrite shared state by key. Safe in either order: mutates
    // an existing ref's value when the composable already created it.
    setState(key: string, value: unknown) {
      const entry = stateMap.get(key);
      if (entry) {
        entry.value = value;
      } else {
        stateMap.set(key, ref(value));
      }
    },
  };
}
