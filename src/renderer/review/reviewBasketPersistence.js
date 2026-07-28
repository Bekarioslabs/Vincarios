(function() {
  'use strict';

  function createReviewBasketPersistence(options) {
    options = options || {};
    const api = options.api || null;

    async function restore(state) {
      if (!state || typeof state.restoreSnapshot !== 'function') {
        return { ok: false, code: 'review_basket_state_unavailable', message: 'Review Basket state unavailable.' };
      }
      if (!api || !api.vault || typeof api.vault.loadReviewBasket !== 'function') {
        return { ok: false, code: 'review_basket_persistence_unavailable', message: 'Review Basket persistence unavailable.' };
      }
      const result = await api.vault.loadReviewBasket();
      if (!result || result.ok === false) {
        return { ok: false, code: result && result.code || 'review_basket_load_failed', message: result && result.message || 'Review Basket could not be restored.' };
      }
      state.restoreSnapshot(result.snapshot || { items: [] });
      return { ok: true, warning: result.warning || '' };
    }

    async function persist(snapshot) {
      if (!api || !api.vault || typeof api.vault.saveReviewBasket !== 'function') {
        return { ok: false, code: 'review_basket_persistence_unavailable', message: 'Review Basket persistence unavailable.' };
      }
      const result = await api.vault.saveReviewBasket(snapshot || { items: [] });
      if (!result || result.ok === false) {
        return { ok: false, code: result && result.code || 'review_basket_save_failed', message: result && result.message || 'Review Basket could not be saved.' };
      }
      return { ok: true };
    }

    return Object.freeze({ restore, persist });
  }

  const api = { createReviewBasketPersistence };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosReviewBasketPersistence = Object.freeze(api);
})();