(function() {
  'use strict';

  async function requestExternalProviderContextConsent(options) {
    options = options || {};
    if (options.containsVaultContext !== true) return approved('', false);
    const api = options.api;
    const status = api && api.provider && typeof api.provider.status === 'function'
      ? await safeStatus(api.provider.status)
      : null;
    const activeProvider = status && status.activeProvider ? status.activeProvider : null;
    const requirement = evaluateExternalContextConsentRequirement(activeProvider, true);
    if (!requirement.required) return approved(requirement.endpoint, false);

    const accepted = await showConsentDialog({
      app: options.app,
      label: requirement.label,
      endpoint: requirement.endpoint
    });
    return accepted
      ? approved(requirement.endpoint, true)
      : { approved: false, external: true, endpoint: requirement.endpoint };
  }

  function evaluateExternalContextConsentRequirement(provider, containsVaultContext) {
    const privacy = normalizePrivacy(provider && provider.privacy);
    return {
      required: containsVaultContext === true && privacy !== 'local',
      privacy,
      endpoint: String((provider && provider.baseUrl) || ''),
      label: String((provider && provider.label) || 'External provider')
    };
  }

  function showConsentDialog(options) {
    if (typeof document === 'undefined' || !options.app || typeof options.app.appendChild !== 'function') {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'review-modal-overlay provider-context-consent-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'provider-context-consent-title');

      const dialog = document.createElement('section');
      dialog.className = 'review-modal provider-context-consent-dialog';
      const title = document.createElement('h2');
      title.id = 'provider-context-consent-title';
      title.textContent = 'Send vault context externally?';
      const message = document.createElement('p');
      message.textContent = 'The active provider uses an external endpoint. Context Basket contents will leave this device for this request.';
      const provider = document.createElement('div');
      provider.className = 'provider-context-consent-target';
      provider.textContent = options.label + ' - ' + options.endpoint;
      const actions = document.createElement('div');
      actions.className = 'review-modal-actions';
      actions.appendChild(createButton('Cancel', 'review-modal-cancel', false, resolve, overlay));
      actions.appendChild(createButton('Send once', 'review-modal-confirm', true, resolve, overlay));

      dialog.appendChild(title);
      dialog.appendChild(message);
      dialog.appendChild(provider);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      options.app.appendChild(overlay);
    });
  }

  function createButton(label, className, result, resolve, overlay) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', () => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(result);
    });
    return button;
  }

  async function safeStatus(readStatus) {
    try {
      return await readStatus();
    } catch (_error) {
      return null;
    }
  }

  function normalizePrivacy(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'local' ? 'local' : normalized === 'cloud' ? 'cloud' : 'external';
  }

  function approved(endpoint, external) {
    return { approved: true, external: external === true, endpoint: String(endpoint || '') };
  }

  const api = {
    requestExternalProviderContextConsent,
    evaluateExternalContextConsentRequirement
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosExternalProviderConsent = Object.freeze(api);
})();
