(function () {
  'use strict';

  const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function getFocusable(dialog) {
    return Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter((element) => !element.hidden && element.getClientRects().length > 0);
  }

  function mountModalBehavior(options) {
    const overlay = options && options.overlay;
    const dialog = options && options.dialog;
    const initialFocus = options && options.initialFocus;
    if (!overlay || !dialog) return Object.freeze({ focusInitial() {}, destroy() {} });

    if (!dialog.hasAttribute('tabindex')) dialog.tabIndex = -1;

    function onBackdropPointer(event) {
      if (event.target === overlay) event.preventDefault();
    }

    function onKeyDown(event) {
      if (event.key !== 'Tab') return;
      const focusable = getFocusable(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    overlay.addEventListener('pointerdown', onBackdropPointer);
    overlay.addEventListener('click', onBackdropPointer);
    overlay.addEventListener('keydown', onKeyDown);

    return Object.freeze({
      focusInitial() {
        const preferred = typeof initialFocus === 'function' ? initialFocus() : initialFocus;
        (preferred || getFocusable(dialog)[0] || dialog).focus();
      },
      destroy() {
        overlay.removeEventListener('pointerdown', onBackdropPointer);
        overlay.removeEventListener('click', onBackdropPointer);
        overlay.removeEventListener('keydown', onKeyDown);
      }
    });
  }

  const api = Object.freeze({ mountModalBehavior, getFocusable });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosModalBehavior = api;
})();