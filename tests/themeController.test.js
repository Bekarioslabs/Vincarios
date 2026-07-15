'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createThemeController } = require('../src/renderer/theme/themeController');

function createEnvironment(options) {
  options = options || {};
  let listener = null;
  const media = {
    matches: options.systemIsDark === true,
    addEventListener(type, callback) {
      if (type === 'change') listener = callback;
    },
    removeEventListener() {}
  };
  return {
    document: { documentElement: { dataset: {}, style: {
      values: {},
      setProperty(name, value) { this.values[name] = value; },
      removeProperty(name) { delete this.values[name]; },
      getPropertyValue(name) { return this.values[name] || ''; }
    } } },
    matchMedia() { return media; },
    emitSystemChange(matches) { media.matches = matches; if (listener) listener({ matches }); }
  };
}

test('theme controller resolves app and vault theme precedence on the document root', async () => {
  const environment = createEnvironment({ systemIsDark: true });
  const controller = createThemeController({
    api: { settings: { async get() { return { theme: { mode: 'system' } }; } } },
    document: environment.document,
    matchMedia: environment.matchMedia
  });

  await controller.load();
  assert.equal(environment.document.documentElement.dataset.theme, 'dark');

  controller.setAppTheme({ mode: 'light' });
  assert.equal(environment.document.documentElement.dataset.theme, 'light');

  controller.setVaultOverride('dark');
  assert.equal(environment.document.documentElement.dataset.theme, 'dark');
  assert.equal(controller.snapshot().effectiveTheme, 'dark');
});

test('theme controller follows local system changes only when no vault override exists', async () => {
  const environment = createEnvironment({ systemIsDark: true });
  const controller = createThemeController({
    api: { settings: { async get() { return { theme: { mode: 'system' } }; } } },
    document: environment.document,
    matchMedia: environment.matchMedia
  });

  await controller.load();
  environment.emitSystemChange(false);
  assert.equal(environment.document.documentElement.dataset.theme, 'light');

  controller.setVaultOverride('dark');
  environment.emitSystemChange(false);
  assert.equal(environment.document.documentElement.dataset.theme, 'dark');
});
test('theme controller applies one registered Vault pack after resolving its base theme', async () => {
  const environment = createEnvironment({ systemIsDark: false });
  const controller = createThemeController({
    api: { settings: { async get() { return { theme: { mode: 'system' } }; } } },
    document: environment.document,
    matchMedia: environment.matchMedia,
    themePacks: require('../src/shared/themes/themePacks')
  });

  await controller.load();
  controller.setVaultAppearance({ themeOverride: 'inherit', themePackId: 'high-contrast' });

  assert.equal(environment.document.documentElement.dataset.theme, 'dark');
  assert.equal(environment.document.documentElement.dataset.themePack, 'high-contrast');
  assert.equal(environment.document.documentElement.style.getPropertyValue('--interactive-accent'), '#06b6d4');

  controller.setVaultAppearance({ themeOverride: 'inherit', themePackId: 'default' });
  assert.equal(environment.document.documentElement.dataset.themePack, 'default');
  assert.equal(environment.document.documentElement.style.getPropertyValue('--interactive-accent'), '');
});