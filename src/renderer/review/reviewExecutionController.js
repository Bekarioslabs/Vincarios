(function() {
  'use strict';

  function createReviewExecutionController(options) {
    options = options || {};
    const api = options.api || null;
    const vaultUi = options.vaultUi || null;
    const activityReporter = options.activityReporter || null;

    async function executeProposal(proposal) {
      const result = await executeProposalWrite(proposal);
      recordActivity(proposal, result);
      return result;
    }

    async function executeProposalWrite(proposal) {
      if (!proposal) return fail('unsupported_action', 'Unsupported review action.');

      if (proposal.type === 'create_note') {
        if (!api || !api.vault || typeof api.vault.createNote !== 'function') {
          return fail('write_unavailable', 'Vault create API unavailable.');
        }
        const result = await api.vault.createNote({
          targetFolder: proposal.targetFolder,
          title: proposal.title,
          content: proposal.content
        });
        if (result && result.ok) {
          await refreshFileTree();
          flashResult(proposal, result);
        }
        return result;
      }

      if (proposal.type === 'create_from_template') {
        if (!api || !api.templates || typeof api.templates.createFromReview !== 'function') {
          return fail('write_unavailable', 'Reviewed template API unavailable.');
        }
        const result = await api.templates.createFromReview(proposal);
        if (result && result.ok) {
          await refreshFileTree();
          flashResult(proposal, result);
        }
        return result;
      }

      if (proposal.type === 'update_note') {
        if (!api || !api.vault || typeof api.vault.updateNote !== 'function') {
          return fail('write_unavailable', 'Vault update API unavailable.');
        }
        const result = await api.vault.updateNote({
          targetPath: proposal.targetPath,
          currentContent: proposal.currentContent,
          proposedContent: proposal.proposedContent
        });
        if (result && result.ok) {
          await refreshLoadedMarkdown(proposal.targetPath);
          flashResult(proposal, result);
        }
        return result;
      }

      return fail('unsupported_action', 'Unsupported review action.');
    }

    async function refreshFileTree() {
      const filePanel = vaultUi && vaultUi.filePanel;
      if (!filePanel || typeof filePanel.refreshTree !== 'function') return;
      try {
        await filePanel.refreshTree();
      } catch (_error) {
        // UI refresh failure must not reclassify a committed vault transaction.
      }
    }

    async function refreshLoadedMarkdown(targetPath) {
      const filePanel = vaultUi && vaultUi.filePanel;
      if (!filePanel || typeof filePanel.refreshLoadedMarkdown !== 'function') return;
      try {
        await filePanel.refreshLoadedMarkdown(targetPath);
      } catch (_error) {
        // Preview refresh failure must not reclassify a committed vault transaction.
      }
    }

    function flashResult(proposal, result) {
      const flashState = vaultUi && vaultUi.updateFlashState;
      if (!flashState || typeof flashState.flashTargets !== 'function') return;
      const targets = reviewedWriteFlashTargets(proposal, result);
      if (targets.length) flashState.flashTargets(targets);
    }

    function recordActivity(proposal, result) {
      if (!activityReporter || typeof activityReporter.report !== 'function' || !proposal || !result) return;
      const successful = result.ok === true;
      const targetPath = result.path || proposal.targetPath || proposal.targetFolder || '';
      activityReporter.report({
        message: successful ? reviewActivityLabel(proposal) + ': ' + (targetPath || 'unknown') : (result.message || 'Review action failed.'),
        activity: {
          type: successful ? 'success' : 'error',
          action: reviewActivityLabel(proposal),
          targetPath,
          detail: successful ? 'Review action executed.' : (result.message || 'Review action failed.')
        }
      });
    }

    return Object.freeze({ executeProposal });
  }

  function reviewedWriteFlashTargets(proposal, result) {
    if (!proposal || !result || result.ok !== true) return [];
    if (proposal.type === 'create_note') {
      return compactTargets([{ path: result.path || proposal.targetPath, kind: 'file', reason: 'created' }]);
    }
    if (proposal.type === 'update_note') {
      return compactTargets([{ path: proposal.targetPath, kind: 'file', reason: 'updated' }]);
    }
    if (proposal.type === 'create_from_template') {
      return compactTargets([
        {
          path: result.path || proposal.templatePlanRootPath || proposal.targetPath,
          kind: 'folder',
          reason: 'template_created'
        },
        {
          path: Array.isArray(result.created) ? result.created[0] : '',
          kind: 'file',
          reason: 'created'
        }
      ]);
    }
    return [];
  }

  function compactTargets(targets) {
    const seen = new Set();
    return (Array.isArray(targets) ? targets : []).reduce((items, target) => {
      const normalizedPath = normalizePath(target && target.path);
      if (!normalizedPath || seen.has(normalizedPath)) return items;
      seen.add(normalizedPath);
      items.push(Object.assign({}, target, { path: normalizedPath }));
      return items;
    }, []);
  }

  function reviewActivityLabel(proposal) {
    if (proposal && proposal.type === 'create_note') return 'Created note';
    if (proposal && proposal.type === 'create_from_template') return 'Created template';
    if (proposal && proposal.type === 'update_note') return 'Updated note';
    return 'Review action';
  }

  function normalizePath(value) {
    return getVaultPathApi().normalizeRelativePath(value);
  }

  function getVaultPathApi() {
    if (typeof window !== 'undefined' && window.VincariosVaultPath) return window.VincariosVaultPath;
    if (typeof require === 'function') return require('../path/vaultPath');
    throw new Error('Vault path contract unavailable.');
  }

  function fail(code, message) {
    return { ok: false, code, message };
  }

  const api = {
    createReviewExecutionController,
    reviewedWriteFlashTargets
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosReviewExecution = Object.freeze(api);
})();
