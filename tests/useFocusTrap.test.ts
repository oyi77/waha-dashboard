import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import {
  useFocusTrap,
  type FocusTrap,
} from "../composables/useFocusTrap";

// The composable only touches a narrow DOM surface (addEventListener,
// activeElement, querySelectorAll/querySelector, focus(), isConnected,
// hasAttribute). jsdom is not installed in this project and package.json is
// off-limits here, so tests drive that surface through a minimal shim. This
// keeps the suite deterministic and dependency-free like tests/useLocale.test.ts.

type KeyHandler = (event: KeyboardEvent) => void;

// Structural fake: everything the composable touches plus a debug name.
type FakeElement = HTMLElement & { name: string };

interface FakeDocument {
  activeElement: HTMLElement | null;
  addEventListener(type: string, handler: KeyHandler): void;
  removeEventListener(type: string, handler: KeyHandler): void;
}

const realDocument = globalThis.document;
let doc!: FakeDocument;
let handlers!: Set<KeyHandler>;

function installFakeDocument(): void {
  handlers = new Set();
  doc = {
    activeElement: null,
    addEventListener(_type, handler) {
      handlers.add(handler);
    },
    removeEventListener(_type, handler) {
      handlers.delete(handler);
    },
  };
  (globalThis as unknown as { document: unknown }).document = doc;
}

// Fakes implement only the narrow DOM surface the composable touches; one
// explicit cast bridges them to HTMLElement without stubbing 300+ members.
interface RawFake {
  name: string;
  focus(): void;
  isConnected: boolean;
  hasAttribute(attr: string): boolean;
  querySelectorAll(): FakeElement[];
  querySelector(selector: string): FakeElement | null;
}

function makeEl(
  name: string,
  opts: { disabled?: boolean; connected?: boolean; children?: FakeElement[] } = {},
): FakeElement {
  const el: RawFake = {
    name,
    focus() {
      doc.activeElement = el as unknown as FakeElement;
    },
    isConnected: opts.connected ?? true,
    hasAttribute(attr: string) {
      return attr === "disabled" && opts.disabled === true;
    },
    querySelectorAll() {
      return opts.children ?? [];
    },
    querySelector(selector: string) {
      if (!opts.children) return null;
      // "#name" style selectors used by initialFocusSelector in tests.
      return opts.children.find((c) => selector === `#${c.name}`) ?? null;
    },
  };
  return el as unknown as FakeElement;
}

function keyEvent(key: "Tab" | "Escape", shiftKey = false): KeyboardEvent {
  return { key, shiftKey, preventDefault: vi.fn() } as unknown as KeyboardEvent;
}

function fire(event: KeyboardEvent): void {
  for (const handler of [...handlers]) handler(event);
}

/** Container whose focusables are [first, second, last]. */
function threeButtonModal() {
  const first = makeEl("first");
  const second = makeEl("second");
  const last = makeEl("last");
  const overlay = makeEl("overlay", { children: [first, second, last] });
  return { overlay, first, second, last };
}

beforeEach(installFakeDocument);
afterEach(() => {
  (globalThis as unknown as { document: unknown }).document = realDocument;
});

describe("useFocusTrap", () => {
  it("activates by focusing the first focusable descendant", () => {
    const { overlay, first } = threeButtonModal();
    const trap = useFocusTrap();

    trap.activate(overlay);

    expect(trap.isActive).toBe(true);
    expect(doc.activeElement).toBe(first);
  });

  it("honours initialFocusSelector when provided", () => {
    const { overlay, second } = threeButtonModal();
    const trap = useFocusTrap({ initialFocusSelector: "#second" });

    trap.activate(overlay);

    expect(doc.activeElement).toBe(second);
  });

  it("cycles forward at the boundary: Tab from the last element wraps to the first", () => {
    const { overlay, first, last } = threeButtonModal();
    const trap = useFocusTrap();
    trap.activate(overlay);
    last.focus();

    const event = keyEvent("Tab");
    fire(event);

    expect(doc.activeElement).toBe(first);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("leaves interior forward Tab moves to the browser (no preventDefault)", () => {
    const { overlay, second } = threeButtonModal();
    const trap = useFocusTrap();
    trap.activate(overlay);
    second.focus();

    const event = keyEvent("Tab");
    fire(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(doc.activeElement).toBe(second); // browser would move it natively
  });

  it("cycles backward at the boundary: Shift+Tab from the first element wraps to the last", () => {
    const { overlay, first, last } = threeButtonModal();
    const trap = useFocusTrap();
    trap.activate(overlay);
    first.focus();

    const event = keyEvent("Tab", true);
    fire(event);

    expect(doc.activeElement).toBe(last);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("pulls focus into the container when the active element is outside", () => {
    const { overlay, first, last } = threeButtonModal();
    const outsider = makeEl("outsider");
    const trap = useFocusTrap();
    trap.activate(overlay);

    // Focus sits outside the modal entirely.
    doc.activeElement = outsider;

    const forward = keyEvent("Tab");
    fire(forward);
    expect(doc.activeElement).toBe(first);
    expect(forward.preventDefault).toHaveBeenCalledTimes(1);

    doc.activeElement = outsider;

    const backward = keyEvent("Tab", true);
    fire(backward);
    expect(doc.activeElement).toBe(last);
    expect(backward.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("is a safe no-op on Tab when the container has no focusable elements", () => {
    const emptyOverlay = makeEl("empty-overlay", { children: [] });
    const trap = useFocusTrap();
    trap.activate(emptyOverlay);

    const event = keyEvent("Tab");
    expect(() => fire(event)).not.toThrow();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(trap.isActive).toBe(true);
  });

  it("restores focus to the previously focused element on deactivate", () => {
    const { overlay } = threeButtonModal();
    const trigger = makeEl("trigger-button");
    doc.activeElement = trigger;

    const trap = useFocusTrap();
    trap.activate(overlay);
    expect(doc.activeElement).not.toBe(trigger);

    trap.deactivate();

    expect(trap.isActive).toBe(false);
    expect(doc.activeElement).toBe(trigger);
  });

  it("skips restoring focus when the previous element left the document", () => {
    const { overlay, first } = threeButtonModal();
    const removedTrigger = makeEl("removed-trigger", { connected: false });
    doc.activeElement = removedTrigger;

    const trap = useFocusTrap();
    trap.activate(overlay);
    trap.deactivate();

    // Focus stays wherever the modal left it instead of resurrecting a dead node.
    expect(doc.activeElement).toBe(first);
  });

  it("invokes onEscape exactly once per Escape press while active", () => {
    const { overlay } = threeButtonModal();
    const onEscape = vi.fn();
    const trap = useFocusTrap({ onEscape });
    trap.activate(overlay);

    fire(keyEvent("Escape"));
    expect(onEscape).toHaveBeenCalledTimes(1);

    trap.deactivate();
    fire(keyEvent("Escape"));
    expect(onEscape).toHaveBeenCalledTimes(1); // inert once deactivated
  });

  it("deactivates when the owning component/effect scope unmounts", () => {
    const { overlay } = threeButtonModal();
    const trigger = makeEl("trigger-button");
    doc.activeElement = trigger;

    let trap!: FocusTrap;
    const scope = effectScope();
    scope.run(() => {
      trap = useFocusTrap();
    });
    trap.activate(overlay);
    expect(handlers.size).toBe(1);

    // Component teardown == effect scope stop.
    scope.stop();

    expect(trap.isActive).toBe(false);
    expect(handlers.size).toBe(0); // keydown listener removed
    expect(doc.activeElement).toBe(trigger); // focus restored
  });

  it("re-activation while active swaps containers without leaking listeners", () => {
    const modalA = threeButtonModal();
    const modalB = threeButtonModal();
    const trap = useFocusTrap();

    trap.activate(modalA.overlay);
    trap.activate(modalB.overlay);

    expect(handlers.size).toBe(1); // one live listener, not two
    expect(trap.isActive).toBe(true);

    modalB.last.focus();
    const event = keyEvent("Tab");
    fire(event);
    // Cycling now happens within B, not A.
    expect(doc.activeElement).toBe(modalB.first);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    void modalA;
  });
});
