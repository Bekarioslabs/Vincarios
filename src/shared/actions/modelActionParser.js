(function() {
  'use strict';

  const MODEL_TOOL_CALL_PATTERN = /<\|tool_call\|?>\s*call:([a-zA-Z_][\w-]*)\s*(?:\{([^}]*)\}|\(([^)]*)\))\s*<tool_call\|>/g;
  
  function parseModelActionCalls(text) {
    const input = String(text || '');
    const calls = [];
    let match;
  
    while ((match = MODEL_TOOL_CALL_PATTERN.exec(input)) !== null) {
      const type = normalizeActionType(match[1]);
      const args = parseArgumentBlock(match[2] || match[3]);
      calls.push({
        type,
        path: normalizePathLike(args.path || ''),
        raw: match[0]
      });
    }
  
    return calls;
  }
  
  function stripModelActionCalls(text) {
    return String(text || '').replace(MODEL_TOOL_CALL_PATTERN, '').trim();
  }
  
  function parseArgumentBlock(block) {
    const args = {};
    const input = String(block || '');
    const pathMatch = input.match(/\bpath\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|([^,})]+))/);
    if (pathMatch) {
      args.path = pathMatch[1] || pathMatch[2] || pathMatch[3] || '';
    }
    return args;
  }
  
  function normalizeActionType(type) {
    const normalized = String(type || '').trim().toLowerCase().replace(/-/g, '_');
    if (normalized === 'list_directory') return 'list_folder';
    return normalized;
  }
  
  function normalizePathLike(value) {
    return String(value || '')
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/');
  }
  
  const api = {
    parseModelActionCalls,
    stripModelActionCalls,
    normalizePathLike
  };
  
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosModelActionParser = Object.freeze(api);
})();
