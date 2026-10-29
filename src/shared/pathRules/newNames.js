(function() {
  'use strict';

  const MAX_NAME_LENGTH = 255;
  const RESERVED_DEVICE_NAME = /^(con|prn|aux|nul|com[1-9\u00b9\u00b2\u00b3]|lpt[1-9\u00b9\u00b2\u00b3])$/i;

  function validateNewName(name) {
    if (typeof name !== 'string' || !name.length) return fail('A name is required.');
    if (name.length > MAX_NAME_LENGTH) return fail('Names must be ' + MAX_NAME_LENGTH + ' UTF-16 code units or fewer, including the file extension.');
    if (name !== name.trim() || /[.]$/.test(name)) return fail('Names must not start or end with whitespace, or end with a period.');
    if (/[\x00-\x1f\x7f]/.test(name)) return fail('Names must not contain control characters.');
    if (/[<>:"/\\|?*]/.test(name)) return fail('Names must not contain < > : " / \\ | ? or *.');
    if (/[\[\]#^]/.test(name)) return fail('Names must not contain [ ] # or ^ because these delimit Markdown links.');
    const stem = name.split('.')[0].replace(/ +$/g, '');
    if (RESERVED_DEVICE_NAME.test(stem)) return fail('This name is reserved by Windows, even with a file extension.');
    return { ok: true };
  }

  function fail(message) { return { ok: false, code: 'invalid_name', message }; }

  const api = Object.freeze({ MAX_NAME_LENGTH, validateNewName });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosNewNames = api;
})();
