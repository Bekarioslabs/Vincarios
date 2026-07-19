(function() {
  'use strict';

  const profileApi = getVaultProfileApi();
  const actionSchemaApi = getActionSchemaApi();
  const proposalPlanApi = getProposalPlanApi();
  const diffPreviewApi = getDiffPreviewApi();
  const generatedMetadataApi = getGeneratedMetadataApi();
  const DEFAULT_AI_RESPONSE_SUBFOLDER = 'AI Responses';

  function createReviewBasketState(options) {
    options = options || {};
    const onChange = typeof options.onChange === 'function' ? options.onChange : null;
    const items = [];
    let nextId = 1;

    function addProposal(proposal) {
      const item = normalizeProposal(proposal, nextId++);
      const duplicate = findOpenDuplicate(item);
      if (duplicate) {
        return Object.assign({}, duplicate, { duplicate: true });
      }
      items.push(item);
      emitChange();
      return item;
    }

    function upsertOpenManualUpdateProposal(proposal) {
      const item = normalizeProposal(proposal, nextId);
      const existing = findOpenManualUpdate(item);
      if (!existing) {
        nextId += 1;
        items.push(item);
        emitChange();
        return Object.assign({}, item, { replaced: false });
      }

      const preservedId = existing.id;
      const preservedSelected = existing.selected;
      Object.keys(existing).forEach((key) => delete existing[key]);
      Object.assign(existing, item, {
        id: preservedId,
        selected: item.executable === false ? false : preservedSelected
      });
      emitChange();
      return Object.assign({}, existing, { replaced: true });
    }
    function addProposalPlan(planInput) {
      const parsed = proposalPlanApi.parseProposalPlan(planInput);
      if (!parsed.ok) return parsed;
      const added = [];
      const duplicates = [];
      parsed.items.forEach((proposal) => {
        const item = addProposal(proposal);
        if (item.duplicate) duplicates.push(item);
        else added.push(item);
      });
      return {
        ok: true,
        title: parsed.title,
        added,
        duplicates
      };
    }
    function restoreSnapshot(snapshot) {
      const restoredItems = snapshot && Array.isArray(snapshot.items) ? snapshot.items : [];
      items.length = 0;
      nextId = 1;

      restoredItems.forEach((proposal) => {
        if (!proposal || proposal.status === 'dismissed') return;
        const numericId = getProposalNumber(proposal.id);
        const item = normalizeProposal(proposal, numericId || nextId);
        item.status = normalizeRestoredStatus(proposal.status);
        items.push(item);
        nextId = Math.max(nextId, (numericId || 0) + 1);
      });

      emitChange();
      return getSnapshot();
    }

    function getProposalNumber(value) {
      const match = /^proposal-(\d+)$/.exec(String(value || ''));
      return match ? Number(match[1]) : 0;
    }

    function normalizeRestoredStatus(value) {
      const status = String(value || 'open').trim().toLowerCase();
      return ['open', 'done', 'failed', 'rejected', 'stale'].includes(status) ? status : 'failed';
    }
    function findOpenDuplicate(candidate) {
      return items.find((item) => item.status === 'open' && item.fingerprint === candidate.fingerprint) || null;
    }

    function findOpenManualUpdate(candidate) {
      return items.find((item) => item.status === 'open'
        && item.type === 'update_note'
        && item.targetPath === candidate.targetPath
        && item.reason === 'Manual Markdown source edit from preview editor.') || null;
    }


    function setSelected(id, selected) {
      const item = findById(id);
      if (!item || item.status !== 'open') return null;
      item.selected = item.executable !== false && selected === true;
      emitChange();
      return Object.assign({}, item);
    }

    function getSelectedOpenItems() {
      return items
        .filter((item) => item.status === 'open' && item.executable !== false && item.selected !== false)
        .map((item) => Object.assign({}, item));
    }

    function updateProposal(id, patch) {
      const item = findById(id);
      if (!item || item.status !== 'open') return null;
      Object.assign(item, patch || {});
      item.fingerprint = createProposalFingerprint(item);
      emitChange();
      return Object.assign({}, item);
    }

    function updateStatus(id, status, patch) {
      const item = findById(id);
      if (!item) return null;
      Object.assign(item, patch || {}, { status });
      emitChange();
      return Object.assign({}, item);
    }

    function remove(id) {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const removed = items.splice(index, 1)[0];
      emitChange();
      return Object.assign({}, removed);
    }

    function clearOpen() {
      const removed = [];
      for (let index = items.length - 1; index >= 0; index -= 1) {
        if (items[index].status === 'open') {
          removed.unshift(items.splice(index, 1)[0]);
        }
      }
      if (removed.length) emitChange();
      return removed.map((item) => Object.assign({}, item));
    }

    function clearDone() {
      const removed = [];
      for (let index = items.length - 1; index >= 0; index -= 1) {
        if (items[index].status === 'done') {
          removed.unshift(items.splice(index, 1)[0]);
        }
      }
      if (removed.length) emitChange();
      return removed.map((item) => Object.assign({}, item));
    }

    function findById(id) {
      return items.find((item) => item.id === id) || null;
    }
    function getSnapshot() {
      return {
        items: items.map((item) => Object.assign({}, item))
      };
    }

    function emitChange() {
      if (onChange) onChange(getSnapshot());
    }

    return Object.freeze({
      addProposal,
      upsertOpenManualUpdateProposal,
      addProposalPlan,
      restoreSnapshot,
      setSelected,
      getSelectedOpenItems,
      updateStatus,
      updateProposal,
      remove,
      clearOpen,
      clearDone,
      getSnapshot
    });
  }

  function createSaveAssistantResponseProposal(content, options) {
    options = options || {};
    const cleanContent = String(content || '').trim();
    const originAction = options.originAction || generatedMetadataApi.ORIGIN_ACTIONS.saveAssistantResponse;
    const generated = generatedMetadataApi.applyGeneratedNoteMetadata(cleanContent, {
      originAction,
      metadata: options.metadata,
      now: options.now
    });
    return {
      type: 'create_note',
      category: 'create',
      title: deriveTitle(options.suggestedTitle || cleanContent),
      targetFolder: options.targetFolder || resolveSaveResponseTargetFolder(options),
      content: generated.content,
      metadata: generated.metadata,
      originAction,
      reason: 'Save assistant response as a Markdown note.',
      risk: 'low'
    };
  }

  function getGeneratedMetadataApi() {
    if (typeof window !== 'undefined' && window.VitruviosGeneratedNoteMetadata) return window.VitruviosGeneratedNoteMetadata;
    if (typeof require === 'function') {
      try {
        return require('../../shared/metadata/generatedNoteMetadata');
      } catch (error) {
        // Node fallback failed; report a clear API error below.
      }
    }
    throw new Error('Generated note metadata API unavailable.');
  }

  function resolveSaveResponseTargetFolder(options) {
    const childPath = [DEFAULT_AI_RESPONSE_SUBFOLDER, options.responseSubfolder]
      .map((part) => String(part || '').trim().replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
    return profileApi.joinFolderRolePath(options.profile, profileApi.FOLDER_ROLES.inbox, childPath);
  }

  function getVaultProfileApi() {
    if (typeof window !== 'undefined' && window.VitruviosVaultProfile) return window.VitruviosVaultProfile;
    if (typeof require === 'function') {
      try {
        return require('../../shared/vaultProfile/defaults');
      } catch (error) {
        // Node fallback failed; report a clear API error below.
      }
    }
    throw new Error('Vault profile API unavailable.');
  }

  function getActionSchemaApi() {
    if (typeof window !== 'undefined' && window.VitruviosActionSchema) return window.VitruviosActionSchema;
    if (typeof require === 'function') {
      try {
        return require('../../shared/actions/actionSchema');
      } catch (error) {
        // Node fallback failed; report a clear API error below.
      }
    }
    throw new Error('Action schema API unavailable.');
  }

  function getProposalPlanApi() {
    if (typeof window !== 'undefined' && window.VitruviosProposalPlan) return window.VitruviosProposalPlan;
    if (typeof require === 'function') {
      try {
        return require('../../shared/actions/proposalPlan');
      } catch (error) {
        // Node fallback failed; report a clear API error below.
      }
    }
    throw new Error('Proposal plan API unavailable.');
  }

  function getDiffPreviewApi() {
    if (typeof window !== 'undefined' && window.VitruviosDiffPreview) return window.VitruviosDiffPreview;
    if (typeof require === 'function') {
      try {
        return require('../../shared/actions/diffPreview');
      } catch (error) {
        // Node fallback failed; report a clear API error below.
      }
    }
    throw new Error('Diff preview API unavailable.');
  }
  function normalizeProposal(proposal, id) {
    const item = actionSchemaApi.normalizeActionProposal(proposal, { id: 'proposal-' + id });
    return attachDiffPreview(item);
  }

  function attachDiffPreview(item) {
    if (!item || !item.requiresDiff || !item.currentContent || !item.proposedContent) return item;
    item.diffPreview = diffPreviewApi.buildMarkdownDiffPreview({
      currentContent: item.currentContent,
      proposedContent: item.proposedContent
    });
    if (item.diffPreview && item.diffPreview.ok && item.diffPreview.changed === false) {
      item.executable = false;
      item.selected = false;
      item.noChange = true;
      item.reason = item.reason || 'No content changes were proposed.';
    }
    return item;
  }


  function createProposalFingerprint(item) {
    return actionSchemaApi.createActionFingerprint(item);
  }
function deriveTitle(content) {
    const heading = content.match(/^#{1,6}\s+(.+)$/m);
    const rawTitle = heading ? heading[1] : content.split(/\r?\n/).find(Boolean);
    const words = String(rawTitle || 'AI Response')
      .replace(/[*_`#[\]]/g, '')
      .replace(/[\\/:*?"<>|]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 7);
    return words.join(' ') || 'AI Response';
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      createReviewBasketState,
      createSaveAssistantResponseProposal,
      deriveTitle
    };
  }

  if (typeof window !== 'undefined') {
    window.VitruviosReviewBasketState = Object.freeze({
      createReviewBasketState,
      createSaveAssistantResponseProposal
    });
  }
})();



