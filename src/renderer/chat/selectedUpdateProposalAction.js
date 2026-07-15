(function() {
  'use strict';

  function isSelectedFileUpdateRequest(userText) {
    const text = String(userText || '').toLowerCase();
    if (!text.trim()) return false;
    const targetHint = /\b(this|selected|current)\s+(note|file|markdown|md)\b/.test(text)
      || /\b(note|file|markdown|md)\b/.test(text);
    const updateHint = /\b(update|change|edit|rewrite|revise|add|append|insert|remove|delete|replace)\b/.test(text);
    return targetHint && updateHint;
  }

  function buildSelectedFileUpdateMessages(selection, userText, options) {
    options = options || {};
    const normalized = normalizeSelection(selection);
    if (!normalized.ok) return normalized;

    const currentContent = normalized.content;
    const truncatedContent = truncateContent(currentContent, options.maxChars);
    return {
      ok: true,
      path: normalized.path,
      currentContent,
      updateMode: 'whole_note',
      diagnostics: {
        path: normalized.path,
        instructionChars: String(userText || '').trim().length,
        currentContentChars: currentContent.length,
        sentContentChars: truncatedContent.length,
        truncated: truncatedContent.length !== currentContent.length
      },
      messages: [
        {
          role: 'system',
          content: [
            'You are vitruvios preparing a reviewed whole-note update proposal.',
            'Return only JSON. Do not use Markdown fences.',
            'V1 supports whole-note replacement only. Do not emit partial patches.',
            'The app will show a diff before anything is written.',
            'Content updates only: do not rename, move, retarget, create, archive, or delete files.',
            'Keep the same file path. Ignore any user request that asks for rename, move, or folder changes; explain that in reason instead.',
            'Required JSON fields: title, proposedContent, reason.',
            'Optional JSON fields: risk.',
            'proposedContent must be the full updated Markdown note.'
          ].join('\n')
        },
        {
          role: 'user',
          content: [
            'Return only JSON for an update_note proposal.',
            '',
            'Path: ' + normalized.path,
            'Update mode: whole_note',
            'Allowed scope: content of this Markdown note only.',
            'Not allowed: rename, move, retarget, create another file, archive, delete, or change file path.',
            '',
            'User request:',
            String(userText || '').trim(),
            '',
            'Current Markdown:',
            '```md',
            truncatedContent,
            '```'
          ].join('\n')
        }
      ]
    };
  }

  function parseSelectedFileUpdateProposal(modelText, context) {
    const parsed = parseJsonObject(modelText);
    if (!parsed.ok) return parsed;
    const value = parsed.value;
    const proposedContent = String(value.proposedContent || value.afterContent || '').trim();
    if (!proposedContent) return fail('missing_proposed_content', 'Update proposal did not include proposedContent.');

    return {
      ok: true,
      proposal: {
        type: 'update_note',
        title: String(value.title || 'Update selected note'),
        targetPath: String(context && context.path || ''),
        currentContent: String(context && context.currentContent || ''),
        proposedContent,
        reason: String(value.reason || 'User requested an update to the selected note.'),
        risk: normalizeRisk(value.risk),
        updateMode: 'whole_note'
      }
    };
  }

  function normalizeSelection(selection) {
    if (!selection || selection.kind !== 'file') return fail('not_file', 'Select a Markdown file first.');
    const path = String(selection.path || '');
    if (!/\.(md|markdown)$/i.test(path)) return fail('not_markdown', 'Update proposals support Markdown files only.');
    if (selection.readAllowed !== true) return fail('read_required', 'Enable R for this file before proposing an update.');
    if (selection.writeAllowed !== true) return fail('write_required', 'Enable W for this file before proposing an update.');
    if (typeof selection.content !== 'string' || selection.content.length === 0) return fail('content_required', 'Load the Markdown file before proposing an update.');
    return { ok: true, path, content: selection.content };
  }

  function parseJsonObject(text) {
    const raw = stripJsonFence(String(text || '').trim());
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('invalid_json_object', 'Update proposal JSON must be an object.');
      return { ok: true, value };
    } catch (error) {
      return fail('invalid_json', 'Update proposal JSON is invalid.');
    }
  }

  function stripJsonFence(text) {
    const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return match ? match[1].trim() : text;
  }

  function truncateContent(content, maxChars) {
    const limit = normalizeMaxChars(maxChars);
    const value = String(content || '');
    return value.length > limit ? value.slice(0, limit) + '\n\n[...truncated for update proposal context...]' : value;
  }

  function normalizeMaxChars(value) {
    const number = Number(value);
    if (Number.isFinite(number) && number >= 4000) return Math.floor(number);
    return 20000;
  }

  function normalizeRisk(value) {
    const risk = String(value || '').toLowerCase();
    return ['low', 'medium', 'high'].includes(risk) ? risk : 'medium';
  }

  function fail(code, message) {
    return { ok: false, code, message };
  }

  const api = {
    isSelectedFileUpdateRequest,
    buildSelectedFileUpdateMessages,
    parseSelectedFileUpdateProposal
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosSelectedUpdateProposalAction = Object.freeze(api);
})();

