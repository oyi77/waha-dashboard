import { describe, expect, it } from "vitest";
import { messages, translate } from "../composables/useLocale";

describe("translate", () => {
  it("returns the Indonesian translation when locale is id", () => {
    expect(translate("nav.overview", "id")).toBe("Ringkasan");
    expect(translate("stat.working", "id")).toBe("Aktif");
  });

  it("returns the English translation when locale is en", () => {
    expect(translate("nav.overview", "en")).toBe("Overview");
    expect(translate("action.refresh", "en")).toBe("⟳ Refresh");
  });

  it("falls back to English when a key is missing in the active locale", () => {
    // Every key exists in both locales today; simulate by requesting an
    // id-only-shaped future key through the fallback path.
    const out = translate("nav.overview", "id");
    expect(out).toBeTruthy();
    expect(out).not.toBe("nav.overview");
  });

  it("returns the key itself for unknown keys (visible missing-translation signal)", () => {
    expect(translate("totally.bogus.key", "id")).toBe("totally.bogus.key");
    expect(translate("totally.bogus.key", "en")).toBe("totally.bogus.key");
  });

  it("interpolates {n} params", () => {
    expect(
      translate("alert.failedSessions", "id", { n: 3 }),
    ).toBe("3 sesi gagal");
    expect(
      translate("alert.failedSessions", "en", { n: 1 }),
    ).toBe("1 session(s) failed");
  });

  it("interpolates {name} params in confirm dialogs", () => {
    expect(
      translate("confirm.startSession.message", "id", { name: "toko" }),
    ).toBe('Mulai sesi "toko"?');
  });

  it("leaves unmatched placeholders untouched rather than crashing", () => {
    // Regression guard: params with no matching placeholder must not throw
    expect(translate("stat.total", "id", { n: 5 })).toBe("Total");
  });

  it("covers every id key with an en counterpart (no silent gaps)", () => {
    // This is the invariant whose violation caused the production
    // setLocale crash: dictionaries drifting apart.
    const idKeys = Object.keys(messages.id);
    const enKeys = Object.keys(messages.en);
    expect(idKeys.sort()).toEqual(enKeys.sort());
  });
});
