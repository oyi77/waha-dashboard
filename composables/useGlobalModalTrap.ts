// Global modal focus trap — wires composables/useFocusTrap to ANY
// `.modal-overlay` that appears anywhere in the app, via a MutationObserver.
//
// Every modal in this app follows the same DOM contract:
//   <div class="modal-overlay">…<div class="modal-box">focusables</div></div>
// so instead of wiring each page individually, the layout calls this once and
// every existing and future modal gets Tab-cycling for free.
//
// Escape handling stays with each page's own @keydown.escape on the overlay
// (it works because the trap keeps focus inside the overlay).

import { onScopeDispose, onMounted } from "vue";
import { useFocusTrap } from "./useFocusTrap";

export function useGlobalModalTrap(): void {
  const trap = useFocusTrap();
  let currentBox: HTMLElement | null = null;
  let observer: MutationObserver | null = null;

  function sync(): void {
    const overlays = document.querySelectorAll<HTMLElement>(".modal-overlay");
    const overlay = overlays.length ? overlays[overlays.length - 1] : null;
    if (!overlay) {
      if (trap.isActive) {
        trap.deactivate();
        currentBox = null;
      }
      return;
    }
    const box = overlay.querySelector<HTMLElement>(".modal-box") ?? overlay;
    if (trap.isActive && box === currentBox) return; // already trapping this modal
    if (trap.isActive) trap.deactivate(); // stacked/switched modals
    currentBox = box;
    trap.activate(box);
  }

  onMounted(() => {
    observer = new MutationObserver(() => sync());
    observer.observe(document.body, { childList: true, subtree: true });
    sync();
  });

  onScopeDispose(() => {
    observer?.disconnect();
    observer = null;
  });
}
