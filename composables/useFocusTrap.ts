// Reusable modal focus trap. Extracted from the hand-rolled trap in
// pages/Workers.vue so every modal can share one implementation.
//
// Usage (inside a component setup()):
//   const overlay = ref<HTMLElement | null>(null);
//   const trap = useFocusTrap({ onEscape: () => closeModal() });
//   watch(isOpen, (open) => open ? trap.activate(overlay.value!) : trap.deactivate());
//
// Behavior:
//   - activate(el) remembers the currently focused element, starts listening
//     for Tab/Shift+Tab/Escape on document, and moves focus into `el`
//     (initialFocusSelector match, else first focusable descendant).
//   - Tab cycles forward within the container; Shift+Tab cycles backward;
//     both wrap at the boundaries. Interior moves are left to the browser.
//   - deactivate() removes the listener and restores focus to the element
//     that was focused before activation (if it is still in the document).
//   - Cleanup runs automatically when the owning component/effect scope is
//     disposed, so an active trap never outlives its owner.

import { onScopeDispose } from "vue";

/** Mirrors pages/Workers.vue: interactive elements, skipping explicit tab-order opt-outs. */
const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface FocusTrapOptions {
  /** Invoked when Escape is pressed while the trap is active (e.g. close the modal). */
  onEscape?: () => void;
  /** Optional selector (scoped to the container) choosing the initial focus target. */
  initialFocusSelector?: string;
}

export interface FocusTrap {
  /** Start trapping keyboard focus inside `container`. Re-activation while active is safe. */
  activate(container: HTMLElement): void;
  /** Stop trapping and restore focus to the previously focused element. Idempotent. */
  deactivate(): void;
  /** True between activate() and deactivate(). */
  readonly isActive: boolean;
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => !el.hasAttribute("disabled"));
}

export function useFocusTrap(options: FocusTrapOptions = {}): FocusTrap {
  let container: HTMLElement | null = null;
  let previouslyFocused: HTMLElement | null = null;
  let active = false;

  function handleKeydown(event: KeyboardEvent): void {
    if (!active || !container) return;

    if (event.key === "Escape") {
      options.onEscape?.();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = getFocusable(container);
    // Empty container: swallow Tab so focus cannot escape the (empty) trap.
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    // Strict-safe lookup: indexOf cannot take a possibly-null activeElement.
    const current = document.activeElement;
    const index = focusable.findIndex((el) => el === current);
    if (event.shiftKey) {
      // Backward: wrap from (or before) the first element to the last.
      if (index <= 0) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      }
    } else {
      // Forward: pull outside/out-of-list focus to the top, wrap from the end.
      if (index === -1 || index === focusable.length - 1) {
        event.preventDefault();
        focusable[0].focus();
      }
    }
    // Interior indices fall through: the browser moves focus natively.
  }

  function focusInitialTarget(): void {
    if (!container) return;
    const chosen =
      (options.initialFocusSelector
        ? container.querySelector<HTMLElement>(options.initialFocusSelector)
        : null) ??
      getFocusable(container)[0] ??
      container;
    chosen.focus();
  }

  function activate(nextContainer: HTMLElement): void {
    if (active) deactivate();
    previouslyFocused = (document.activeElement as HTMLElement | null) ?? null;
    container = nextContainer;
    active = true;
    document.addEventListener("keydown", handleKeydown);
    focusInitialTarget();
  }

  function deactivate(): void {
    if (!active) return;
    document.removeEventListener("keydown", handleKeydown);
    active = false;
    container = null;
    if (previouslyFocused?.isConnected) {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  }

  // Component unmount (or any enclosing effectScope stop) tears the trap down.
  // `true` suppresses the warning thrown outside a reactive context.
  onScopeDispose(deactivate, true);

  return {
    activate,
    deactivate,
    get isActive(): boolean {
      return active;
    },
  };
}
