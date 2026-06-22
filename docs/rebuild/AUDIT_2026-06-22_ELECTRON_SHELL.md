# Electron Shell Audit - 2026-06-22

## Scope

Initial Electron shell and minimal IPC/preload bridge.

Checked:

- Electron dependency
- main app bootstrap
- BrowserWindow security options
- preload bridge shape
- initial IPC channel list
- renderer shell independence from Node integration

## Result

Status: pass.

Electron was added as a dev dependency. The renderer is configured with:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- `allowRunningInsecureContent: false`

## Implemented In This Block

- `src/main/app/bootstrapElectron.js`
- `src/main/app/createMainWindow.js`
- `src/main/ipc/registerAppIpc.js`
- `src/preload/index.js`
- `src/shared/ipc/channels.js`
- `src/renderer/shell/mountShell.js`
- `index.html`
- `tests/electronShell.test.js`

## Intentional Boundaries

- Preload exposes only `window.zeus.appInfo()`.
- No filesystem API is exposed to the renderer.
- No vault read/write IPC exists yet.
- Renderer shell is browser-compatible and does not require Node integration.

## Next Recommended Block

Create the first vault service boundary:

1. define vault profile type/defaults
2. add safe folder listing service
3. add Markdown-only read service
4. expose read-only IPC through preload
5. test that all paths pass through safety rules