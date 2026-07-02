const test = require('node:test');
const assert = require('node:assert/strict');

const { buildInboxCleanupReport, formatInboxCleanupReportMarkdown } = require('../src/shared/cleanup/inboxCleanupReport');

test('buildInboxCleanupReport groups inbox entries without creating actions', () => {
  const report = buildInboxCleanupReport({
    inboxPath: '00_Inbox',
    entries: [
      { name: 'AI Responses', path: '00_Inbox/AI Responses', kind: 'folder' },
      { name: 'Summary_DIR_Core_2026-07-02.md', path: '00_Inbox/Summary_DIR_Core_2026-07-02.md', kind: 'file' },
      { name: 'Loose idea.md', path: '00_Inbox//Loose idea.md', kind: 'file' },
      { name: 'image.png', path: '00_Inbox/image.png', kind: 'file' },
    ]
  });

  assert.equal(report.inboxPath, '00_Inbox');
  assert.deepEqual(report.totals, { entries: 4, files: 3, folders: 1, markdown: 2 });
  assert.equal(report.actionsCreated, 0);
  assert.equal(report.groups.find((group) => group.id === 'loose_markdown').candidates[0].path, '00_Inbox/Loose idea.md');
  assert.equal(report.groups.find((group) => group.id === 'summary_notes').count, 1);
  assert.equal(report.groups.find((group) => group.id === 'loose_markdown').count, 1);
  assert.equal(report.groups.find((group) => group.id === 'subfolders').count, 1);
  assert.equal(report.groups.find((group) => group.id === 'other_files').count, 1);
});

test('formatInboxCleanupReportMarkdown presents a report-only cleanup overview', () => {
  const report = buildInboxCleanupReport({
    inboxPath: '00_Inbox',
    entries: [
      { name: 'AI Responses', path: '00_Inbox/AI Responses', kind: 'folder' },
      { name: 'Loose idea.md', path: '00_Inbox//Loose idea.md', kind: 'file' },
    ]
  });

  const markdown = formatInboxCleanupReportMarkdown(report);

  assert.match(markdown, /^## Inbox Cleanup Report/);
  assert.match(markdown, /Path: `00_Inbox`/);
  assert.match(markdown, /Subfolders/);
  assert.match(markdown, /Loose Markdown Notes/);
  assert.match(markdown, /Report only/);
  assert.doesNotMatch(markdown, /Review Basket action created/);
});

test('buildInboxCleanupReport includes one-level subfolder entries in groups', () => {
  const report = buildInboxCleanupReport({
    inboxPath: '00_Inbox',
    entries: [
      { name: 'AI Responses', path: '00_Inbox/AI Responses', kind: 'folder' },
      { name: 'Loose idea.md', path: '00_Inbox/Loose idea.md', kind: 'file' },
    ],
    childEntriesByFolder: {
      '00_Inbox/AI Responses': [
        { name: 'Saved answer.md', path: '00_Inbox/AI Responses/Saved answer.md', kind: 'file' },
        { name: 'Summary - DIR - Inbox - 2026-07-02.md', path: '00_Inbox/AI Responses/Summary - DIR - Inbox - 2026-07-02.md', kind: 'file' },
      ]
    }
  });

  assert.equal(report.totals.entries, 4);
  assert.equal(report.totals.markdown, 3);
  assert.deepEqual(report.scannedFolders, ['00_Inbox', '00_Inbox/AI Responses']);
  assert.equal(report.groups.find((group) => group.id === 'ai_response_notes').count, 1);
  assert.equal(report.groups.find((group) => group.id === 'summary_notes').count, 1);
});