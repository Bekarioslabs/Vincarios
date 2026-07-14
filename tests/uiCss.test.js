'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('collapsible left subactions preserve hidden state despite flex layout', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.left-subactions\s*\{[\s\S]*display:\s*flex;/);
  assert.match(css, /\.left-subactions\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
});
test('permission buttons have explicit inactive and active styling', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');

  assert.match(css, /\.file-permission-controls\s*\{/);
  assert.match(css, /\.file-permission-button\s*\{/);
  assert.match(css, /\.file-permission-button\.is-active\s*\{/);
  assert.match(css, /\.file-permission-button\.is-inherited\s*\{/);
});

test('permission controls sit before file icons in the tree grid', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');

  assert.match(css, /grid-template-columns:\s*auto\s+30px\s+minmax\(0, 1fr\);/);
  assert.match(css, /\.file-permission-controls\s*\{[\s\S]*margin-left:\s*0;/);
});
test('review basket styles stay in the review stylesheet', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const reviewCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(index, /src\/renderer\/styles\/review\.css/);
  assert.doesNotMatch(layoutCss, /\.review-basket-item/);
  assert.match(reviewCss, /\.review-basket-item/);
  assert.match(reviewCss, /\.chat-save-note-button/);
});

test('create note preview title input is styled in review stylesheet', () => {
  const reviewCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(reviewCss, /\.review-modal-field\s*\{/);
  assert.match(reviewCss, /\.review-modal-title-input\s*\{/);
});
test('folder scope action buttons use chat message styles', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.chat-message-actions\s*\{/);
  assert.match(css, /\.chat-message-action-button\s*\{/);
});
test('assistant chat markdown has compact scoped styles', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.chat-message-markdown\s*\{/);
  assert.match(css, /\.chat-message-markdown h1/);
  assert.match(css, /\.chat-message-markdown pre code/);
});
test('Markdown history controls use the shared tool-control styling', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const componentsCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'components.css'), 'utf8');
  const markdownCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'markdown.css'), 'utf8');

  assert.match(index, /styles\/components\.css/);
  assert.match(componentsCss, /\.ui-tool-button\s*\{/);
  assert.match(componentsCss, /\.ui-tool-button:hover:not\(:disabled\)/);
  assert.match(componentsCss, /\.ui-tool-button:disabled/);
  assert.doesNotMatch(markdownCss, /\.markdown-history-button\s*\{/);
});
test('diff review modal styles stay in the review stylesheet', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(source, /review-diff-button/);
  assert.match(source, /review-diff-body/);
  assert.match(source, /review-diff-line-add/);
  assert.match(source, /review-diff-line-remove/);
});
test('review basket polish stays isolated in review stylesheet', () => {
  const reviewCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(reviewCss, /\.review-clear-button\s*\{[\s\S]*background:\s*transparent;[\s\S]*color:\s*var\(--text-muted\);/);
  assert.match(reviewCss, /\.review-execute-button\s*\{[\s\S]*background:\s*rgba\(var\(--interactive-accent-rgb\), \.1\);[\s\S]*color:\s*var\(--text-accent\);/);
  assert.match(reviewCss, /\.review-execute-button:disabled,[\s\S]*\.review-clear-button:disabled\s*\{[\s\S]*opacity:\s*\.45;/);
  assert.match(reviewCss, /\.review-basket-item-status\s*\{[\s\S]*display:\s*inline-grid;[\s\S]*border-radius:\s*var\(--radius-pill\);/);
  assert.match(reviewCss, /\.review-basket-item\[data-status="failed"\] \.review-basket-item-status/);
  assert.match(reviewCss, /\.review-status-icon/);
  assert.match(reviewCss, /\.review-status-dot/);
});
test('review destructive clear controls use subtle danger styling only when active', () => {
  const reviewCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(reviewCss, /\.review-danger-button:not\(:disabled\)\s*\{[\s\S]*border-color:\s*rgba\(var\(--status-danger-rgb\), \.28\);/);
  assert.match(reviewCss, /\.review-danger-button:hover:not\(:disabled\)\s*\{[\s\S]*color:\s*var\(--status-danger-soft\);/);
});
test('vault panel uses full-height Files Actions Preview columns', () => {
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(shell, /class="selection-actions-pane"/);
  assert.match(shell, /data-future-slot="selection-actions"/);
  assert.match(layoutCss, /\.vault-panel\s*\{[\s\S]*display:\s*grid;/);
  assert.match(layoutCss, /grid-template-columns:\s*minmax\(var\(--files-panel-min-width\), var\(--files-panel-width\)\)\s+var\(--panel-divider-width\)\s+minmax\(var\(--selection-actions-panel-min-width\), var\(--selection-actions-panel-width\)\)\s+var\(--panel-divider-width\)\s+minmax\(0, 1fr\);/);
  assert.doesNotMatch(layoutCss, /grid-template-rows:\s*minmax\(180px, var\(--vault-top-height/);
  assert.match(layoutCss, /\.files-pane > #file-panel\s*\{[\s\S]*height:\s*100%;[\s\S]*overflow:\s*hidden;/);
  assert.doesNotMatch(layoutCss, /\.preview-pane\s*\{[^}]*grid-column:\s*1 \/ -1;/);
});

test('vault panel exposes three vertical resize handles', () => {
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const resizeSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'layout', 'paneResize.js'), 'utf8');
  const tokensCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');

  assert.match(shell, /data-resize="files"/);
  assert.match(shell, /data-resize="actions"/);
  assert.doesNotMatch(shell, /data-resize="preview"/);
  assert.match(resizeSource, /const actionsHandle = app\.querySelector\('\[data-resize="actions"\]'\)/);
  assert.match(resizeSource, /function resizeActions\(app, clientX\)/);
  assert.doesNotMatch(resizeSource, /function resizePreview\(app, clientY\)/);
  assert.doesNotMatch(resizeSource, /--vault-top-height/);
  assert.match(tokensCss, /--selection-actions-width:\s*280px;/);
});
test('Selection Actions collapses to an accessible icon strip without removing action state', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(css, /\.vault-panel\.is-selection-actions-collapsed\s*\{[\s\S]*var\(--selection-actions-collapsed-width\)/);
  assert.doesNotMatch(css, /\.vault-panel\.is-selection-actions-collapsed \[data-resize="actions"\]\s*\{\s*display:\s*none;/);
  assert.match(css, /\.vault-panel\.is-selection-actions-collapsed \.selection-action-label\s*\{\s*display:\s*none;/);
  assert.match(css, /\.vault-panel\.is-selection-actions-collapsed \.selection-action-lock-icon\s*\{[\s\S]*position:\s*absolute;/);
  assert.match(css, /\.vault-panel\.is-selection-actions-collapsed \.selection-action-execution-icon\s*\{[\s\S]*position:\s*absolute;/);
  assert.match(css, /\.preview-pane\s*\{[\s\S]*grid-column:\s*5;/);
  assert.doesNotMatch(css, /\.pane-resizer\.is-disabled\s*\{/);
  assert.doesNotMatch(shell, /setPanelResizerEnabled/);
  assert.match(shell, /filesResizer\.addEventListener\('vitruvios:panel-resize-start'/);
  assert.match(shell, /actionsResizer\.addEventListener\('vitruvios:panel-resize-start'/);
});

test('Files collapses to a compact rail while preserving the Actions and Preview columns', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.vault-panel\.is-files-collapsed\s*\{[\s\S]*var\(--files-collapsed-width\)/);
  assert.doesNotMatch(css, /\.vault-panel\.is-files-collapsed \[data-resize="files"\]\s*\{\s*display:\s*none;/);
  assert.doesNotMatch(css, /\.vault-panel\.is-files-collapsed \.files-pane\s*\{[\s\S]*border-right:/);
  assert.match(css, /\.vault-panel\.is-files-collapsed \.file-tree\s*\{\s*display:\s*none;/);
  assert.match(css, /\.vault-panel\.is-files-collapsed\.is-selection-actions-collapsed\s*\{[\s\S]*--selection-actions-panel-width:\s*var\(--selection-actions-collapsed-width\);/);
  assert.match(css, /\.vault-panel\.is-selection-actions-collapsed \.selection-actions-content\s*\{[\s\S]*min-width:\s*0;/);
});
test('chat pending messages expose a lightweight spinner animation', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.chat-message-pending \.chat-message-body::before/);
  assert.match(css, /@keyframes vitruvios-pending-spin/);
});
test('chat message metadata appears on hover with copy affordance', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.chat-message-meta/);
  assert.match(css, /\.chat-message:hover \.chat-message-meta/);
  assert.match(css, /\.chat-message-copy/);
});
test('file tree uses local SVG icon sizing instead of unicode pseudo icons', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');

  assert.match(css, /\.vitruvios-icon/);
  assert.match(css, /\.file-row-chevron-icon/);
  assert.match(css, /grid-template-columns:\s*auto 30px minmax\(0, 1fr\)/);
  assert.doesNotMatch(css, /file-row-icon::before/);
});
test('Markdown history icons are filtered for dark UI visibility', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'markdown.css'), 'utf8');

  assert.match(css, /\.markdown-history-icon\s*\{[\s\S]*filter:\s*var\(--icon-inverse-filter\)/);
});

test('Markdown properties use dedicated metadata styling tokens', () => {
  const tokensCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');
  const markdownCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'markdown.css'), 'utf8');

  assert.match(tokensCss, /--metadata-accent:/);
  assert.match(tokensCss, /--metadata-background:/);
  assert.match(tokensCss, /--metadata-border:/);
  assert.match(markdownCss, /\.markdown-properties\s*\{[\s\S]*border:\s*1px solid var\(--metadata-border\);/);
  assert.match(markdownCss, /\.markdown-properties\s*\{[\s\S]*background:\s*var\(--metadata-background\);/);
  assert.match(markdownCss, /\.markdown-properties dt\s*\{[\s\S]*color:\s*var\(--text-muted\);/);
  assert.match(markdownCss, /\.markdown-properties dd\s*\{[\s\S]*color:\s*var\(--metadata-accent\);/);
});
test('review basket failed item errors use review stylesheet', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(css, /review-basket-error-summary/);
  assert.match(css, /--status-danger/);
});
test('visual system tokens expose shared semantic scales for themed UI work', () => {
  const tokensCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');

  assert.match(tokensCss, /--surface-app:/);
  assert.match(tokensCss, /--surface-raised:/);
  assert.match(tokensCss, /--surface-focus:/);
  assert.match(tokensCss, /--text-ui:/);
  assert.match(tokensCss, /--text-ui-emphasis:/);
  assert.match(tokensCss, /--font-size-ui-xs:/);
  assert.match(tokensCss, /--font-size-ui-md:/);
  assert.match(tokensCss, /--icon-size-tool:/);
  assert.match(tokensCss, /--control-size-tool:/);
  assert.match(tokensCss, /--space-1:/);
  assert.match(tokensCss, /--space-4:/);
});
test('text selection uses semantic neutral tokens instead of the amber interaction accent', () => {
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const tokensCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');

  assert.match(tokensCss, /--selection-background:\s*rgba\(214,\s*214,\s*214,\s*(?:0?\.\d+|0|1)\);/);
  assert.match(tokensCss, /--selection-text:\s*var\(--text-strong\);/);
  const selectionRule = layoutCss.match(/::selection\s*\{[^}]*\}/)[0];

  assert.match(selectionRule, /background:\s*var\(--selection-background\);/);
  assert.match(selectionRule, /color:\s*var\(--selection-text\);/);
  assert.doesNotMatch(selectionRule, /interactive-accent-rgb/);
});

test('readability tokens activate bundled Inter and avoid ultra-heavy UI weights', () => {
  const tokensCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');
  const filesCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(tokensCss, /--font-interface:\s*'Inter', 'Segoe UI'/);
  assert.match(tokensCss, /--text-muted:\s*#8a8a8a;/);
  assert.match(tokensCss, /--font-weight-ui-strong:\s*700;/);
  assert.doesNotMatch(filesCss, /font-weight:\s*900;/);
  assert.doesNotMatch(layoutCss, /font-size:\s*9px;/);
});
test('chat input uses auto-grow styling instead of manual resize', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.chat-input-shell\s*\{[\s\S]*resize:\s*none;[\s\S]*overflow-y:\s*hidden;/);
  assert.match(css, /\.selection-action-form textarea\s*\{[\s\S]*resize:\s*vertical;/);
});

test('left navigation keeps settings in a separate bottom group', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.left-nav-actions\s*\{[\s\S]*flex:\s*1 1 auto;/);
  assert.match(css, /\.left-nav-group-settings\s*\{[\s\S]*margin-top:\s*auto;/);
  assert.match(css, /\.left-nav-group-settings\s*\{[\s\S]*border-top:\s*1px solid var\(--background-modifier-border\);/);
  assert.match(css, /\.left-button\[data-left-icon\]\s*\{[\s\S]*justify-content:\s*flex-start;/);
  assert.match(css, /\.left-button-icon\s*\{[\s\S]*filter:\s*var\(--icon-muted-filter, none\);/);
});
test('expanded left navigation uses flat rows with shared UI tokens', () => {
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const componentsCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'components.css'), 'utf8');

  assert.match(componentsCss, /\.ui-flat-row\s*\{[\s\S]*border:\s*0;/);
  assert.match(componentsCss, /\.ui-flat-row\s*\{[\s\S]*background:\s*transparent;/);
  assert.match(componentsCss, /\.ui-flat-row\s*\{[\s\S]*font-size:\s*var\(--font-size-ui-md\);/);
  assert.match(layoutCss, /\.left-button\[data-left-icon\]\s*\{[\s\S]*justify-content:\s*flex-start;/);
  assert.match(layoutCss, /\.left-button-current\s*\{[\s\S]*background:\s*var\(--surface-raised\);/);
  assert.match(layoutCss, /\.left-button-icon\s*\{[\s\S]*width:\s*var\(--icon-size-tool\);/);
  assert.doesNotMatch(layoutCss, /\.left-button\s*\{[\s\S]*font-size:\s*var\(--font-size-ui-md\);/);
});
test('collapsed left navigation becomes an icon rail with quiet group separators', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.app-shell\.is-left-nav-collapsed\s+\.left-nav\s*\{[\s\S]*width:\s*var\(--left-nav-collapsed-width\);/);
  assert.match(css, /\.app-shell\.is-left-nav-collapsed\s+\.left-section-title\s*\{[\s\S]*font-size:\s*0;/);
  assert.match(css, /\.app-shell\.is-left-nav-collapsed\s+\.left-button-label\s*\{[\s\S]*display:\s*none;/);
  assert.match(css, /\.app-shell\.is-left-nav-collapsed\s+\.left-subactions\s*\{[\s\S]*display:\s*none;/);
});
test('chat drag-over styling stays scoped to the chat log', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(source, /\.chat-log\.chat-log-drag-over/);
  assert.match(source, /--interactive-accent-rgb/);
});


test('similar notes mini form uses selection action form styling', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /.selection-action-grid/);
  assert.match(css, /.selection-action-grid input,/);
  assert.match(css, /.selection-action-grid select/);
});

test('similar notes detail panel uses compact score styling', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.selection-action-results\s*\{/);
  assert.match(css, /\.selection-action-result-item\s*\{/);
  assert.match(css, /\.selection-action-score\.is-strong/);
  assert.match(css, /\.selection-action-score\.is-medium/);
  assert.match(css, /\.selection-action-score\.is-weak/);
  assert.match(css, /\.selection-action-score\.is-noisy/);
});

test('chat baskets scroll locally instead of expanding the workspace', () => {
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const reviewCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(layoutCss, /\.workspace-stack\s*\{[\s\S]*grid-template-rows:\s*minmax\(180px, 1fr\) minmax\(0, min-content\) minmax\(0, min-content\) auto;/);
  assert.match(layoutCss, /\.review-slot\s*\{[\s\S]*max-height:\s*min\(20vh, 180px\);[\s\S]*overflow:\s*hidden;/);
  assert.match(layoutCss, /\.context-slot\s*\{[\s\S]*max-height:\s*min\(16vh, 144px\);[\s\S]*overflow:\s*hidden;/);
  assert.match(layoutCss, /\.context-basket-items\s*\{[\s\S]*min-height:\s*0;[\s\S]*overflow:\s*auto;/);
  assert.match(reviewCss, /\.review-basket-items\s*\{[\s\S]*min-height:\s*0;[\s\S]*overflow:\s*auto;/);
});
test('soft-disabled selection actions stay neutral while category dots preserve non-color semantics', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.selection-action-button\.is-soft-disabled,\s*\.selection-action-button\.is-layout-locked\s*\{[\s\S]*border-color:\s*transparent;/);
  assert.match(css, /\.selection-action-button\.is-soft-disabled,\s*\.selection-action-button\.is-layout-locked\s*\{[\s\S]*background:\s*transparent;/);
  assert.match(css, /\.selection-action-button\.is-soft-disabled \.selection-action-category-dot,\s*\.selection-action-button\.is-layout-locked \.selection-action-category-dot\s*\{[\s\S]*background:\s*var\(--background-modifier-border\);/);
  assert.match(css, /\.selection-action-button:not\(\.is-soft-disabled\):not\(\.is-layout-locked\)\[data-action-category="read"\] \.selection-action-category-dot\s*\{\s*background:\s*var\(--action-read\);\s*\}/);
  assert.match(css, /\.selection-action-button:not\(\.is-soft-disabled\):not\(\.is-layout-locked\)\[data-action-category="write"\] \.selection-action-category-dot\s*\{\s*background:\s*var\(--action-write\);\s*\}/);
  assert.match(css, /\.selection-action-lock-icon\s*\{[\s\S]*filter:\s*var\(--icon-muted-filter, none\);/);
  assert.match(css, /\.selection-action-label \+ \.selection-action-lock-icon\s*\{\s*margin-left:\s*auto;\s*\}/);
  assert.match(css, /\.selection-action-execution-icon\.is-provider/);
  assert.match(css, /\.selection-action-execution-icon\.is-embedding/);
  assert.doesNotMatch(css, /\.selection-action-button\.is-soft-disabled\s*\{[\s\S]*border-style:\s*dashed;/);
});
test('file permission buttons distinguish direct inherited and off states without color alone', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');

  assert.match(css, /\.file-permission-button\s*\{[\s\S]*background:\s*var\(--background-primary\);/);
  assert.match(css, /\.file-permission-button\.is-active\s*\{[\s\S]*box-shadow:\s*inset 0 0 0 1px rgba\(var\(--interactive-accent-rgb\), \.28\);/);
  assert.match(css, /\.file-permission-button\.is-inherited\s*\{[\s\S]*border-style:\s*dashed;/);
  assert.match(css, /\.file-permission-button\.is-inherited\s*\{[\s\S]*box-shadow:\s*none;/);
});

test('compact empty states use shared icon styling', () => {
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const suggestionsCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'suggestions.css'), 'utf8');

  assert.match(layoutCss, /\.mini-panel-empty-rich\s*\{[\s\S]*display:\s*inline-flex;/);
  assert.match(layoutCss, /\.empty-state-icon\s*\{[\s\S]*filter:\s*var\(--icon-muted-filter, none\);/);
  assert.match(suggestionsCss, /\.suggestions-empty-state\s*\{[\s\S]*display:\s*flex;/);
  assert.match(suggestionsCss, /\.suggestions-empty-detail\s*\{[\s\S]*font-size:\s*11px;/);
});

test('provider privacy badge uses provider-mode styling instead of static local-only copy', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(shell, /id="provider-privacy-badge"/);
  assert.match(css, /\.provider-privacy-badge\s*\{/);
  assert.match(css, /data-provider-privacy="cloud"/);
  assert.match(css, /data-provider-privacy="external"/);
});

test('visual polish uses tokenized transitions and file-row update flash', () => {
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const fileCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');
  const settingsCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'settings.css'), 'utf8');

  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'components.css'), 'utf8'), /\.ui-flat-row\s*\{[\s\S]*transition: background-color var\(--transition-fast\)/);
  assert.match(layoutCss, /\.left-button-current\s*\{[\s\S]*background: var\(--surface-raised\);/);
  assert.match(fileCss, /\.file-row\.is-recently-updated\s*\{[\s\S]*animation: file-row-update-flash \.85s ease-out;/);
  assert.match(fileCss, /\.file-row\.is-recently-updated\s*\{[\s\S]*outline: 1px solid rgba\(var\(--interactive-accent-rgb\), \.36\);/);
  assert.match(fileCss, /@keyframes file-row-update-flash/);
  assert.match(fileCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(settingsCss, /\.settings-category-button\.is-active\s*\{[\s\S]*box-shadow: inset 0 0 0 1px rgba\(var\(--interactive-accent-rgb\), \.06\);/);
});

test('suggestions similarity scores use compact token-driven rings', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'suggestions.css'), 'utf8');

  assert.match(css, /\.suggestions-score-ring\s*{[\s\S]*width:\s*34px;/);
  assert.match(css, /\.suggestions-score-ring-track,[\s\S]*\.suggestions-score-ring-fill\s*{[\s\S]*stroke-width:\s*3;/);
  assert.match(css, /\.suggestions-score-ring-fill\s*{[\s\S]*stroke:\s*currentColor;/);
  assert.doesNotMatch(css, /suggestions-item-score-meter/);
  assert.doesNotMatch(css, /\.suggestions-item-score\s*{/);
});


test('suggestions score rings use shared score tokens', () => {
  const tokensCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'suggestions.css'), 'utf8');

  assert.match(tokensCss, /--color-amber-200:\s*#fde68a;/);
  assert.match(tokensCss, /--color-orange-500:\s*#f97316;/);
  assert.match(tokensCss, /--score-medium:\s*var\(--color-amber-200\);/);
  assert.match(tokensCss, /--score-weak:\s*var\(--color-orange-500\);/);
  assert.match(css, /\.suggestions-score-ring-wrap\.is-score-yellow\s*{[\s\S]*color:\s*var\(--score-medium\);/);
  assert.match(css, /\.suggestions-score-ring-wrap\.is-score-orange\s*{[\s\S]*color:\s*var\(--score-weak\);/);
});
test('Files and Selection Actions use the shared toolbar structure across collapse states', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const componentsCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'components.css'), 'utf8');
  const filePanel = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const tokensCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');

  assert.match(tokensCss, /--panel-toolbar-height:\s*36px;/);
  assert.match(tokensCss, /--panel-rail-width:\s*48px;/);
  assert.match(tokensCss, /--files-collapsed-width:\s*var\(--panel-rail-width\);/);
  assert.match(tokensCss, /--selection-actions-collapsed-width:\s*var\(--panel-rail-width\);/);
  assert.match(filePanel, /class="file-toolbar ui-panel-header"/);
  assert.match(shell, /class="selection-actions-header ui-panel-header"/);
  assert.match(componentsCss, /\.ui-panel-header\s*\{[\s\S]*min-height:\s*var\(--panel-toolbar-height\);[\s\S]*border-bottom:\s*1px solid var\(--border-structural\);/);
  assert.match(css, /\.pane-resizer::after\s*\{[\s\S]*background:\s*var\(--border-structural\);/);
  assert.doesNotMatch(css, /\.vault-panel\s*\{[^}]*border-left:/);
  assert.doesNotMatch(css, /^\.selection-actions-pane\s*\{[^}]*border-right:/m);
  assert.match(css, /\.vault-panel\s*\{[\s\S]*grid-template-columns:\s*minmax\(var\(--files-panel-min-width\), var\(--files-panel-width\)\)\s+var\(--panel-divider-width\)\s+minmax\(var\(--selection-actions-panel-min-width\), var\(--selection-actions-panel-width\)\)\s+var\(--panel-divider-width\)\s+minmax\(0, 1fr\);/);
  assert.match(css, /body\.is-resizing \.vault-panel\s*\{\s*transition:\s*none;/);
  assert.match(css, /\.vault-panel\.is-files-collapsed \.file-toolbar\s*\{[\s\S]*padding-right:\s*0;/);
  assert.match(css, /\.vault-panel\.is-selection-actions-collapsed \.selection-actions-header\s*\{[\s\S]*border-bottom:\s*0;/);
});
test('icon-only tool controls share the compact visual scale', () => {
  const componentsCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'components.css'), 'utf8');
  const markdownCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'markdown.css'), 'utf8');

  assert.match(componentsCss, /\.ui-tool-button\s*\{[\s\S]*width:\s*var\(--control-size-tool\);/);
  assert.match(componentsCss, /\.ui-tool-button\s*\{[\s\S]*border:\s*0;/);
  assert.match(componentsCss, /\.ui-tool-button\s*\{[\s\S]*height:\s*var\(--control-size-tool\);/);
  assert.match(componentsCss, /\.ui-tool-button \.vitruvios-icon\s*\{[\s\S]*width:\s*var\(--icon-size-tool\);/);
  assert.match(markdownCss, /\.markdown-history-icon\s*\{[\s\S]*width:\s*var\(--icon-size-tool\);/);
});
test('bottom bar separates global and preview-local status surfaces', () => {
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const markdownCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'markdown.css'), 'utf8');

  assert.match(shell, /id="status-bar-global"/);
  assert.match(shell, /id="markdown-preview-status"/);
  assert.equal(shell.indexOf('id="markdown-preview-status"') > shell.indexOf('status.innerHTML = ['), true);
  assert.doesNotMatch(shell, /mountChat\(\{ api, app, status, reviewBasket, contextState \}\)/);
  assert.doesNotMatch(shell, /mountOptional\('[^']+', status,/);
  assert.match(shell, /mountChat\(\{ api, app, status: globalStatus, reviewBasket, contextState \}\)/);
  assert.match(layoutCss, /\.status-bar\s*\{[\s\S]*display:\s*grid;/);
  assert.match(layoutCss, /grid-template-columns:\s*var\(--left-nav-width\) minmax\(var\(--min-main-width\), 1fr\) minmax\(var\(--min-vault-width\), var\(--vault-panel-width\)\);/);
  assert.match(layoutCss, /\.status-bar-global\s*\{[\s\S]*grid-column:\s*1 \/ 3;/);
  assert.match(markdownCss, /\.markdown-preview-status\s*\{[\s\S]*grid-column:\s*3;/);
  assert.match(markdownCss, /\.markdown-preview-status\s*\{[\s\S]*border-left:\s*1px solid var\(--background-modifier-border\);/);
  assert.match(markdownCss, /\.markdown-preview-status\.is-empty\s*\{[\s\S]*background:\s*var\(--background-secondary\);/);
  assert.doesNotMatch(markdownCss, /\.markdown-preview-status\s*\{[\s\S]*border-top:/);
});
test('panel dividers separate visual boundaries from the full resize hit area', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const tokensCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');

  assert.match(tokensCss, /--panel-divider-width:\s*1px;/);
  assert.match(tokensCss, /--panel-resize-hit-area:\s*7px;/);
  assert.match(css, /\.pane-resizer\s*\{[\s\S]*?width:\s*var\(--panel-divider-width\);/);
  assert.match(css, /\.pane-resizer::before\s*\{[\s\S]*?width:\s*var\(--panel-resize-hit-area\);/);
  assert.match(css, /\.pane-resizer::after\s*\{[^}]*width:\s*var\(--panel-divider-width\);/);
});
test('chat baskets start collapsed and render compact context packets', () => {
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const reviewCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');
  const contextSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'context', 'mountContextBasket.js'), 'utf8');

  assert.match(shell, /id="review-basket" class="review-slot is-collapsed"/);
  assert.match(shell, /data-panel-toggle="review-basket" aria-expanded="false"/);
  assert.match(shell, /id="context-basket" class="context-slot is-collapsed"/);
  assert.match(shell, /data-panel-toggle="context-basket" aria-expanded="false"/);
  assert.match(
    layoutCss,
    /\.workspace-stack\s*\{[\s\S]*grid-template-rows:\s*minmax\(180px, 1fr\) minmax\(0, min-content\) minmax\(0, min-content\) auto;/
  );
  assert.match(layoutCss, /\.context-slot\.is-collapsed\s*\{[\s\S]*min-height:\s*var\(--basket-collapsed-height\);/);
  assert.match(reviewCss, /\.review-slot\.is-collapsed\s*\{[\s\S]*min-height:\s*var\(--basket-collapsed-height\);/);
  assert.match(contextSource, /context-basket-icon-svg/);
  assert.match(contextSource, /context-basket-path/);
});

test('Vault Profile appearance controls use settings-scoped styles and shared visual tokens', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'settings.css'), 'utf8');

  assert.match(css, /\.settings-vault-role-appearance/);
  assert.match(css, /var\(--background-modifier-border\)/);
  assert.match(css, /\.settings-vault-role-preview/);
});

test('Vault Profile color palette is compact and ordered in five square swatches per row', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'settings.css'), 'utf8');

  assert.match(css, /\.settings-vault-picker\[data-vault-color-options\]\s*\{[\s\S]*grid-template-columns:\s*repeat\(5, 24px\);/);
  assert.match(css, /\.settings-vault-picker-swatch\s*\{[\s\S]*width:\s*24px;[\s\S]*border-radius:\s*var\(--radius-ui-sm\);/);
});
test('Vault Profile appearance pickers honor hidden state before interaction', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'settings.css'), 'utf8');

  assert.match(css, /\.settings-vault-picker\[hidden\]\s*\{\s*display:\s*none;/);
});
test('Vault Profile folder visuals use CSP-safe SVG images and fixed token palette styles', () => {
  const fileCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');
  const profileCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'vaultProfile.css'), 'utf8');

  assert.doesNotMatch(fileCss, /-webkit-mask|folder-visual-mask/);
  assert.match(profileCss, /\.file-row-icon\.has-folder-visual \.vitruvios-icon/);
  assert.match(profileCss, /\[data-folder-color="violet-400"\]/);
  assert.match(profileCss, /\[data-folder-color\^="amber-"\]/);
});test('Vault Profile Save buttons stay neutral until a row has local changes', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'settings.css'), 'utf8');

  assert.match(css, /\.settings-vault-role-row \.settings-primary-button\[disabled\]\s*\{[\s\S]*background:\s*var\(--background-modifier-form-field\);/);
  assert.match(css, /\.settings-vault-role-path option:disabled/);
});
