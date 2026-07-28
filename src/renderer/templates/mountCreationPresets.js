(function() {
  'use strict';

  function mountCreationPresets(options) {
    const app = options && options.app;
    const reviewBasket = options && options.reviewBasket;
    const status = options && options.status;
    if (!app) return null;

    const presetApi = getPresetApi();
    const proposalApi = getProposalApi();
    if (!presetApi || !proposalApi) {
      setText(status, 'Template presets unavailable.');
      return null;
    }

    renderPresetList({ app, type: presetApi.PRESET_TYPES.note, presetApi, proposalApi, reviewBasket, status, hostApi: options.api, vaultProfileState: options.vaultProfileState });
    renderPresetList({ app, type: presetApi.PRESET_TYPES.project, presetApi, proposalApi, reviewBasket, status, hostApi: options.api, vaultProfileState: options.vaultProfileState });
    return { refresh: () => mountCreationPresets(options) };
  }

  function renderPresetList(context) {
    const container = context.app.querySelector('[data-preset-list="' + context.type + '"]');
    if (!container) return;
    container.textContent = '';

    context.presetApi.listPresets(context.type).forEach((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'left-subbutton';
      button.setAttribute('data-preset-id', preset.id);
      button.textContent = preset.label;
      button.addEventListener('click', () => openPresetDialog(context, preset));
      container.appendChild(button);
    });
  }

  function openPresetDialog(context, preset) {
    const overlay = document.createElement('div');
    overlay.className = 'review-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'review-modal';
    const inputLabel = preset.type === context.presetApi.PRESET_TYPES.project ? 'Project name' : 'Note title';
    const defaultValue = preset.type === context.presetApi.PRESET_TYPES.project ? 'New Project' : 'Untitled';
    modal.innerHTML = [
      '<div class="review-modal-title">Create from preset: ' + escapeHtml(preset.label) + '</div>',
      '<label class="review-modal-field">',
      '  <span>' + inputLabel + '</span>',
      '  <input class="review-modal-title-input" type="text" value="' + escapeHtml(defaultValue) + '">',
      '</label>',
      '<pre class="review-modal-preview" aria-label="Preset create preview"></pre>',
      '<div class="review-modal-actions">',
      '  <button type="button" class="review-modal-cancel">Cancel</button>',
      '  <button type="button" class="review-modal-confirm" disabled>Add to Review Basket</button>',
      '</div>'
    ].join('');

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = modal.querySelector('.review-modal-title-input');
    const preview = modal.querySelector('.review-modal-preview');
    const cancel = modal.querySelector('.review-modal-cancel');
    const confirm = modal.querySelector('.review-modal-confirm');
    const modalBehavior = getModalBehavior().mountModalBehavior({ overlay, dialog: modal, initialFocus: input });
    let activeProfile = null;

    const updatePreview = () => {
      if (!activeProfile) {
        preview.textContent = 'Loading Vault Profile...';
        return;
      }
      renderPlanPreview(preview, context.presetApi, preset, input.value, activeProfile);
    };
    updatePreview();
    loadProfile(context.hostApi, context.vaultProfileState).then((profile) => {
      activeProfile = profile;
      updatePreview();
      confirm.disabled = false;
    }).catch((error) => {
      preview.textContent = 'Preset preview failed: ' + error.message;
    });

    input.addEventListener('input', updatePreview);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirm.click();
      }
    });
    cancel.addEventListener('click', () => closeDialog(overlay));
    confirm.addEventListener('click', () => {
      if (!hasTargetRole(activeProfile, preset.targetRole)) {
        preview.textContent = 'Assign the ' + preset.targetRole + ' role in Settings before creating from this preset.';
        return;
      }
      addPresetToReviewBasket(context, preset, input.value, activeProfile);
      closeDialog(overlay);
    });
    modalBehavior.focusInitial();
    input.select();
  }

  function renderPlanPreview(preview, presetApi, preset, value, profile) {
    if (!preview) return;
    try {
      const input = preset.type === presetApi.PRESET_TYPES.project ? { projectName: value } : { title: value };
      const plan = presetApi.materializePreset(preset.id, input, profile || getDefaultProfile());
      const lines = ['Target: ' + plan.rootPath];
      if (plan.folders.length) {
        lines.push('', 'Folders:');
        plan.folders.forEach((folder) => lines.push('- ' + folder));
      }
      if (plan.files.length) {
        lines.push('', 'Files:');
        plan.files.forEach((file) => lines.push('- ' + file.path));
      }
      preview.textContent = lines.join('\n');
    } catch (error) {
      preview.textContent = 'Preset preview failed: ' + error.message;
    }
  }

  function addPresetToReviewBasket(context, preset, value, profile) {
    if (!context.reviewBasket || typeof context.reviewBasket.addProposal !== 'function') {
      setText(context.status, 'Review Basket unavailable.');
      return;
    }
    const input = preset.type === context.presetApi.PRESET_TYPES.project ? { projectName: value } : { title: value };
    const plan = context.presetApi.materializePreset(preset.id, input, profile || getDefaultProfile());
    const proposals = context.proposalApi.createNoteProposalsFromPlan(plan);
    proposals.forEach((proposal) => context.reviewBasket.addProposal(proposal));
    setText(context.status, 'Template proposals added to Review Basket: ' + proposals.length);
  }

  function loadProfile(hostApi, vaultProfileState) {
    const vaultProfile = getVaultProfileApi();
    if (vaultProfileState && typeof vaultProfileState.getProfile === 'function') {
      const active = vaultProfileState.getProfile();
      if (active && active.roles) return Promise.resolve(createActiveProfile(active.roles));
    }
    if (!hostApi || !hostApi.vault || typeof hostApi.vault.getProfile !== 'function') {
      return Promise.resolve(getDefaultProfile());
    }
    return hostApi.vault.getProfile().then((result) => {
      const roles = result && result.ok && result.profile ? result.profile.roles : {};
      return createActiveProfile(roles || {});
    });
  }

  function createActiveProfile(roles) {
    return { folders: Object.assign({}, roles || {}) };
  }

  function hasTargetRole(profile, role) {
    return !!(profile && profile.folders && profile.folders[role]);
  }

  function getDefaultProfile() {
    const vaultProfile = getVaultProfileApi();
    return vaultProfile.DEFAULT_VAULT_PROFILE || vaultProfile.createVaultProfile();
  }

  function closeDialog(overlay) {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function getPresetApi() {
    if (typeof require === 'function') return require('../../shared/templates/presetRegistry');
    return window.VincariosTemplatePresets;
  }

  function getProposalApi() {
    if (typeof require === 'function') return require('../../shared/templates/presetProposals');
    return window.VincariosTemplatePresetProposals;
  }

  function getVaultProfileApi() {
    if (typeof require === 'function') return require('../../shared/vaultProfile/defaults');
    return window.VincariosVaultProfile;
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function getModalBehavior() {
    return window.VincariosModalBehavior;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const api = { mountCreationPresets };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosCreationPresets = Object.freeze(api);
})();
