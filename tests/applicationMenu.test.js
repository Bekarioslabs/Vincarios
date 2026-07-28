'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApplicationMenu } = require('../src/main/app/createApplicationMenu');

test('application menu exposes explicit Windows zoom controls through one callback', () => {
  const calls = [];
  const template = createApplicationMenu({ onZoom: (window, command) => calls.push({ window, command }) });
  const viewMenu = template.find((item) => item.label === 'View');
  const window = { id: 1 };

  assert.ok(viewMenu);
  const zoomItems = viewMenu.submenu.filter((item) => item.zoomCommand);
  assert.deepEqual(zoomItems.map((item) => [item.label, item.accelerator, item.zoomCommand]), [
    ['Reset Zoom', 'CommandOrControl+0', 'reset'],
    ['Zoom In', 'CommandOrControl+Plus', 'in'],
    ['Zoom Out', 'CommandOrControl+-', 'out']
  ]);

  zoomItems[1].click(null, window);
  assert.deepEqual(calls, [{ window, command: 'in' }]);
});
test('application menu exposes workspace navigation and opens the repository externally', () => {
  const navigations = [];
  const links = [];
  const template = createApplicationMenu({
    onNavigate: (window, destination) => navigations.push({ window, destination }),
    onOpenExternal: (url) => links.push(url)
  });
  const window = { id: 2 };
  const navigateMenu = template.find((item) => item.label === 'Navigate');
  const helpMenu = template.find((item) => item.label === 'Help');

  assert.ok(navigateMenu);
  assert.deepEqual(navigateMenu.submenu.filter((item) => item.destination).map((item) => [item.label, item.accelerator || null]), [
    ['Home', 'CommandOrControl+Shift+H'],
    ['Search', 'CommandOrControl+F'],
    ['Suggestions', 'CommandOrControl+Shift+S'],
    ['Review Basket', null],
    ['Settings', 'CommandOrControl+,']
  ]);

  navigateMenu.submenu.find((item) => item.destination === 'search').click(null, window);
  navigateMenu.submenu.find((item) => item.destination === 'settings').click(null, window);
  assert.deepEqual(navigations, [
    { window, destination: 'search' },
    { window, destination: 'settings' }
  ]);

  assert.ok(helpMenu);
  const repository = helpMenu.submenu.find((item) => item.label === 'Repository');
  repository.click();
  assert.deepEqual(links, ['https://github.com/Bekarioslabs/Vincarios']);
});
