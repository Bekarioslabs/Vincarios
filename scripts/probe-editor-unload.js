'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');

if (!process.versions.electron) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-unload-probe-'));
  const env = Object.assign({}, process.env);
  delete env.ELECTRON_RUN_AS_NODE;
  try {
    const result = spawnSync(require('electron'), [__filename, temporaryRoot], { env, stdio: 'inherit', windowsHide: true, timeout: 60000 });
    if (result.error) throw result.error;
    process.exitCode = result.status === 0 ? 0 : 1;
  } finally {
    if (path.dirname(temporaryRoot) !== path.resolve(os.tmpdir()) || !path.basename(temporaryRoot).startsWith('vincarios-unload-probe-')) {
      throw new Error('Refusing cleanup outside the owned probe directory.');
    }
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
} else {
  runProbe().catch((error) => {
    console.error(error);
    require('electron').app.exit(1);
  });
}

async function runProbe() {
  const electron = require('electron');
  const { app, BrowserWindow } = electron;
  const fixtureRoot = path.resolve(process.argv[2]);
  if (path.dirname(fixtureRoot) !== path.resolve(os.tmpdir()) || !path.basename(fixtureRoot).startsWith('vincarios-unload-probe-')) {
    throw new Error('Probe requires its owned temporary fixture directory.');
  }
  for (const [key, directory] of [['userData', 'runtime'], ['sessionData', 'session'], ['crashDumps', 'crashes']]) {
    const target = path.join(fixtureRoot, directory);
    fs.mkdirSync(target, { recursive: true });
    app.setPath(key, target);
  }
  const preloadFolder = path.join(fixtureRoot, 'src', 'preload');
  fs.mkdirSync(preloadFolder, { recursive: true });
  fs.writeFileSync(path.join(preloadFolder, 'index.js'), '// Isolated fixture: no IPC or vault access.\n');
  fs.writeFileSync(path.join(fixtureRoot, 'fixture.js'), '(' + installFixture.toString() + ')();');
  const sources = [
    path.join(ROOT, 'src/shared/text/lineEndings.js'),
    path.join(ROOT, 'src/renderer/markdown/previewResourcePolicy.js'),
    path.join(ROOT, 'src/renderer/markdown/markdownPreviewController.js'),
    path.join(fixtureRoot, 'fixture.js')
  ];
  fs.writeFileSync(path.join(fixtureRoot, 'index.html'), '<!doctype html><meta charset="utf-8">'
    + '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' file:; connect-src \'none\'">'
    + '<main id="app"><div id="markdown-preview"></div><textarea id="markdown-source-editor"></textarea>'
    + '<button id="markdown-edit-toggle">Edit</button><button id="markdown-propose-update">Update</button></main>'
    + sources.map((source) => '<script src="' + pathToFileURL(source).href + '"></script>').join(''));

  await app.whenReady();
  app.on('window-all-closed', () => {});
  let choice = 0;
  let prompts = 0;
  let loads = 0;
  const { createMainWindow } = require('../src/main/app/createMainWindow');
  const runtime = {
    app, Menu: electron.Menu, shell: electron.shell,
    BrowserWindow: function HiddenWindow(options) { return new BrowserWindow(Object.assign({}, options, { show: false })); },
    dialog: {
      showMessageBoxSync(_parent, options) {
        assert.equal(options.defaultId, 0);
        assert.equal(options.cancelId, 0);
        prompts += 1;
        return choice;
      }
    }
  };
  const win = createMainWindow(runtime, { projectRoot: fixtureRoot });
  win.webContents.on('did-finish-load', () => { loads += 1; });
  await waitFor(() => loads === 1, 'initial fixture load');
  assert.equal(await win.webContents.executeJavaScript('document.querySelector("textarea").value'), '# Original\n');

  const view = electron.Menu.getApplicationMenu().items.find((item) => item.label === 'View').submenu;
  const reloadFromMenu = (role) => {
    const item = view.items.find((candidate) => String(candidate.role).toLowerCase() === role);
    assert.equal(typeof item.click, 'function');
    item.click(undefined, win, win.webContents);
  };
  const commands = [
    ['reload', () => win.webContents.reload()],
    ['reloadIgnoringCache', () => win.webContents.reloadIgnoringCache()],
    ['View Reload', () => reloadFromMenu('reload')],
    ['View Force Reload', () => reloadFromMenu('forcereload')]
  ];
  for (const [method, reload] of commands) {
    let previousLoads = loads;
    let previousPrompts = prompts;
    reload();
    await waitFor(() => loads > previousLoads, 'clean ' + method);
    assert.equal(prompts, previousPrompts);
    await activateAndEdit(win);
    previousLoads = loads;
    choice = 0;
    reload();
    await waitFor(() => prompts > previousPrompts, 'dirty ' + method + ' Stay');
    await delay(100);
    assert.equal(loads, previousLoads);
    assert.equal(await win.webContents.executeJavaScript('document.querySelector("textarea").value'), '# Edited\n');
    choice = 1;
    reload();
    await waitFor(() => loads > previousLoads, 'dirty ' + method + ' Discard');
    console.log('PASS native ' + method + ': clean, Stay and Discard');
  }
  await activateAndEdit(win);
  let previousPrompts = prompts;
  choice = 0;
  win.close();
  await waitFor(() => prompts > previousPrompts, 'dirty close Stay');
  assert.equal(win.isDestroyed(), false);
  assert.equal(await win.webContents.executeJavaScript('document.querySelector("textarea").value'), '# Edited\n');
  choice = 1;
  win.close();
  await waitFor(() => win.isDestroyed(), 'dirty close Discard');
  console.log('PASS native window close: Stay retains draft, Discard closes');
  let cleanLoaded = false;
  const clean = createMainWindow(runtime, { projectRoot: fixtureRoot });
  clean.webContents.on('did-finish-load', () => { cleanLoaded = true; });
  await waitFor(() => cleanLoaded, 'clean window load');
  previousPrompts = prompts;
  clean.close();
  await waitFor(() => clean.isDestroyed(), 'clean window close');
  assert.equal(prompts, previousPrompts);
  console.log('PASS clean window close: no prompt');
  console.log('Keyboard accelerators still require a foreground-window manual check.');
  app.quit();
}

function installFixture() {
  window.VincariosMarkdownRenderer = { renderMarkdown: (source) => source };
  const controller = window.VincariosMarkdownPreview.mountMarkdownPreview({ app: document.querySelector('#app') });
  controller.setSource('# Original\r\n', 'Fixture.md');
  controller.openSource('Fixture.md');
  window.makeDirty = () => {
    const editor = document.querySelector('textarea');
    editor.value = '# Edited\n';
    editor.dispatchEvent(new Event('input'));
  };
}

async function activateAndEdit(win) {
  await win.webContents.executeJavaScript('document.querySelector("textarea").focus()');
  win.webContents.focus();
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'A' });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'A' });
  await win.webContents.executeJavaScript('window.makeDirty()', true);
  assert.equal(await win.webContents.executeJavaScript('navigator.userActivation.hasBeenActive'), true);
}

async function waitFor(predicate, label) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Timed out: ' + label);
    await delay(25);
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
