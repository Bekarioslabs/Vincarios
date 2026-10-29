'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createSafeIpcMain, createTrustedSender } = require('../src/main/ipc/safeHandle');

const PREFIX = 'vincarios-ipc-probe-';

function ownedFixtureRoot(value) {
  const root = path.resolve(value);
  if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith(PREFIX)) {
    throw new Error('Probe requires its owned temporary fixture directory.');
  }
  return root;
}

if (!process.versions.electron) {
  const root = ownedFixtureRoot(fs.mkdtempSync(path.join(os.tmpdir(), PREFIX)));
  const env = Object.assign({}, process.env);
  delete env.ELECTRON_RUN_AS_NODE;
  try {
    const result = spawnSync(require('electron'), [__filename, root], { env, stdio: 'inherit', windowsHide: true, timeout: 60000 });
    if (result.error) throw result.error;
    process.exitCode = result.status === 0 ? 0 : 1;
  } finally {
    fs.rmSync(ownedFixtureRoot(root), { recursive: true, force: true });
  }
} else {
  runProbe().catch((error) => { console.error(error); require('electron').app.exit(1); });
}

async function runProbe() {
  const { app, BrowserWindow, ipcMain } = require('electron');
  const root = ownedFixtureRoot(process.argv[2]);
  for (const [key, name] of [['userData', 'runtime'], ['sessionData', 'session'], ['crashDumps', 'crashes']]) {
    const directory = path.join(root, name);
    fs.mkdirSync(directory, { recursive: true });
    app.setPath(key, directory);
  }
  const shell = path.join(root, 'fixture shell #1');
  fs.mkdirSync(shell);
  const appFilePath = path.join(shell, 'index.html');
  const preload = path.join(root, 'preload.cjs');
  fs.writeFileSync(preload, "const { contextBridge, ipcRenderer } = require('electron'); contextBridge.exposeInMainWorld('probe', { send: (channel, value) => ipcRenderer.invoke(channel, value) });\n");
  const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; frame-src \'self\'; connect-src \'none\'">';
  fs.writeFileSync(appFilePath, '<!doctype html>' + policy + '<title>IPC fixture</title><iframe src="child.html"></iframe>');
  fs.writeFileSync(path.join(shell, 'child.html'), '<!doctype html>' + policy + '<title>Child fixture</title>');
  fs.writeFileSync(path.join(shell, 'other.html'), '<!doctype html>' + policy + '<title>Untrusted fixture</title>');

  await app.whenReady();
  app.on('window-all-closed', () => {});
  let mainWindow = null;
  let serviceCalls = 0;
  const reports = [];
  const safeIpcMain = createSafeIpcMain(ipcMain, {
    isTrustedSender: createTrustedSender({ getWindow: () => mainWindow, appFilePath }),
    reportError: (report) => reports.push(report)
  });
  safeIpcMain.handle('probe:echo', (_event, value) => { serviceCalls += 1; return { ok: true, value }; });
  safeIpcMain.handle('probe:throw', () => { throw new Error('PRIVATE fixture error'); });
  const windowOptions = { show: false, webPreferences: { preload, nodeIntegration: false, contextIsolation: true, sandbox: true,
    // Adversarial fixture only: make the narrow test bridge available in child frames.
    nodeIntegrationInSubFrames: true } };
  mainWindow = new BrowserWindow(windowOptions);
  await mainWindow.loadFile(appFilePath);
  const send = (window, value) => window.webContents.executeJavaScript('window.probe.send("probe:echo", ' + JSON.stringify(value) + ')');
  assert.deepEqual(await send(mainWindow, 'main'), { ok: true, value: 'main' });
  console.log('PASS native current window/main frame and encoded local file URL');
  const child = mainWindow.webContents.mainFrame.frames[0];
  assert.ok(child);
  assert.equal((await child.executeJavaScript('window.probe.send("probe:echo", "child")')).code, 'ipc_sender_not_allowed');
  assert.equal(serviceCalls, 1);
  console.log('PASS native same-origin child frame denied before service access');
  const foreign = new BrowserWindow(windowOptions);
  await foreign.loadFile(appFilePath);
  assert.equal((await send(foreign, 'foreign')).code, 'ipc_sender_not_allowed');
  console.log('PASS native different window at the same file URL denied');
  await mainWindow.loadFile(path.join(shell, 'other.html'));
  assert.equal((await send(mainWindow, 'other document')).code, 'ipc_sender_not_allowed');
  await mainWindow.loadFile(appFilePath);
  assert.equal((await send(mainWindow, 'reloaded')).ok, true);
  console.log('PASS native wrong document denied and exact-shell reload accepted');
  const failure = await mainWindow.webContents.executeJavaScript('window.probe.send("probe:throw")');
  assert.equal(failure.code, 'ipc_request_failed');
  assert.deepEqual(reports, [{ channel: 'probe:throw', code: 'ipc_request_failed' }]);
  assert.doesNotMatch(JSON.stringify({ failure, reports }), /PRIVATE/);
  console.log('PASS native exception response and content-free error report');
  const previous = mainWindow;
  mainWindow = foreign;
  assert.equal((await send(previous, 'old')).code, 'ipc_sender_not_allowed');
  assert.equal((await send(mainWindow, 'new')).ok, true);
  console.log('PASS native active-window replacement revokes the previous window');
  previous.destroy();
  foreign.destroy();
  app.quit();
}
