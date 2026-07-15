(function() {
  'use strict';

  function parseProposalPlan(input) {
    const parsed = parseInput(input);
    if (!parsed.ok) return parsed;
  
    const plan = parsed.value;
    const rawItems = Array.isArray(plan.items)
      ? plan.items
      : Array.isArray(plan.actions)
        ? plan.actions
        : [];
  
    if (rawItems.length === 0) {
      return fail('empty_proposal_plan', 'Proposal plan has no items.');
    }
  
    return {
      ok: true,
      type: 'proposal_plan',
      title: String(plan.title || plan.name || 'Proposal Plan'),
      summary: String(plan.summary || ''),
      items: rawItems.map((item, index) => getActionSchemaApi().normalizeActionProposal(item, { id: 'proposal-' + (index + 1) }))
    };
  }
  
  function parseInput(input) {
    if (typeof input === 'string') {
      try {
        return { ok: true, value: JSON.parse(input) };
      } catch (error) {
        return fail('invalid_json', 'Proposal plan JSON is invalid.');
      }
    }
    if (input && typeof input === 'object') return { ok: true, value: input };
    return fail('invalid_proposal_plan', 'Proposal plan must be an object or JSON string.');
  }
  
  function fail(code, message) {
    return {
      ok: false,
      code,
      message,
      items: []
    };
  }
  
  function getActionSchemaApi() {
    if (typeof require === 'function') return require('./actionSchema');
    if (typeof window !== 'undefined' && window.VitruviosActionSchema) return window.VitruviosActionSchema;
    throw new Error('vitruvios action schema API is not available.');
  }
  
  const api = { parseProposalPlan };
  
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosProposalPlan = Object.freeze(api);
})();
