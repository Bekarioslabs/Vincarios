(function() {
  'use strict';

  function openFolderAppearanceMenu(options) {
    options = options || {};
    if (!options.path || !options.folderVisualState || typeof document === 'undefined') return null;

    const menu = document.createElement('div');
    menu.className = 'folder-appearance-menu';
    menu.setAttribute('role', 'menu');
    menu.style.left = Math.max(0, options.x || 0) + 'px';
    menu.style.top = Math.max(0, options.y || 0) + 'px';

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'folder-appearance-menu-button';
    action.setAttribute('role', 'menuitem');
    action.textContent = 'Folder appearance...';
    action.addEventListener('click', () => {
      close();
      openFolderAppearanceDialog(options);
    });
    menu.appendChild(action);
    document.body.appendChild(menu);
    action.focus();

    function close() {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
      document.removeEventListener('keydown', closeOnEscape, true);
      if (menu.parentNode) menu.parentNode.removeChild(menu);
    }

    function closeOnOutsidePointer(event) {
      if (!menu.contains(event.target)) close();
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') close();
    }

    setTimeout(() => {
      document.addEventListener('pointerdown', closeOnOutsidePointer, true);
      document.addEventListener('keydown', closeOnEscape, true);
    }, 0);

    return Object.freeze({ close });
  }

  function openFolderAppearanceDialog(options) {
    options = options || {};
    const state = options.folderVisualState;
    const helpers = getFolderVisualHelpers();
    const iconRenderer = getIconRenderer();
    if (!state || !helpers || !iconRenderer) return null;

    const initial = state.get(options.path) || { icon: 'folder', color: 'amber' };
    let selectedIcon = initial.icon;
    let selectedColor = initial.color;

    const overlay = document.createElement('div');
    overlay.className = 'folder-appearance-overlay';
    overlay.setAttribute('role', 'presentation');
    const dialog = document.createElement('section');
    dialog.className = 'folder-appearance-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'folder-appearance-title');
    overlay.appendChild(dialog);

    const heading = document.createElement('div');
    heading.className = 'folder-appearance-heading';
    const title = document.createElement('h2');
    title.id = 'folder-appearance-title';
    title.textContent = 'Folder appearance';
    const target = document.createElement('div');
    target.className = 'folder-appearance-target';
    target.textContent = options.path;
    heading.append(title, target);

    const iconSection = createChoiceSection('Icon', 'folder-appearance-icons');
    const colorSection = createChoiceSection('Color', 'folder-appearance-colors');
    const actions = document.createElement('div');
    actions.className = 'folder-appearance-actions';
    const reset = createButton('Reset', 'folder-appearance-reset', { showLabel: true });
    const cancel = createButton('Cancel', 'folder-appearance-cancel', { showLabel: true });
    const apply = createButton('Apply', 'folder-appearance-apply', { showLabel: true });
    actions.append(reset, cancel, apply);
    dialog.append(heading, iconSection.section, colorSection.section, actions);
    document.body.appendChild(overlay);

    const modal = window.ZeusModalBehavior && window.ZeusModalBehavior.mountModalBehavior
      ? window.ZeusModalBehavior.mountModalBehavior({ overlay, dialog, initialFocus: () => iconSection.buttons[0] })
      : null;

    helpers.FOLDER_VISUAL_ICON_KEYS.forEach((iconKey) => {
      const button = createButton(toLabel(iconKey), 'folder-appearance-icon-option');
      button.dataset.iconKey = iconKey;
      button.setAttribute('aria-pressed', String(iconKey === selectedIcon));
      button.textContent = '';
      button.appendChild(iconRenderer.createIconElement(resolveIconName(iconKey), 'folder-appearance-icon'));
      button.addEventListener('click', () => {
        selectedIcon = iconKey;
        updateIconSelection(iconSection.buttons);
      });
      iconSection.content.appendChild(button);
      iconSection.buttons.push(button);
    });

    helpers.FOLDER_VISUAL_COLOR_KEYS.forEach((colorKey) => {
      const button = createButton(toLabel(colorKey), 'folder-appearance-color-option folder-appearance-color-' + colorKey);
      button.dataset.colorKey = colorKey;
      button.setAttribute('aria-pressed', String(colorKey === selectedColor));
      button.addEventListener('click', () => {
        selectedColor = colorKey;
        updateColorSelection(colorSection.buttons);
      });
      colorSection.content.appendChild(button);
      colorSection.buttons.push(button);
    });

    cancel.addEventListener('click', close);
    reset.addEventListener('click', async () => {
      const result = await state.clear(options.path);
      if (!result || !result.ok) return;
      if (typeof options.onSaved === 'function') options.onSaved('Folder appearance reset: ' + options.path + '.');
      close();
    });
    apply.addEventListener('click', async () => {
      const result = await state.set(options.path, { icon: selectedIcon, color: selectedColor });
      if (!result || !result.ok) return;
      if (typeof options.onSaved === 'function') options.onSaved('Folder appearance saved: ' + options.path + '.');
      close();
    });
    modal && modal.focusInitial();

    function close() {
      modal && modal.destroy();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    function updateIconSelection(buttons) {
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.iconKey === selectedIcon)));
    }

    function updateColorSelection(buttons) {
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.colorKey === selectedColor)));
    }

    return Object.freeze({ close });
  }

  function createChoiceSection(label, className) {
    const section = document.createElement('section');
    section.className = 'folder-appearance-section';
    const heading = document.createElement('h3');
    heading.textContent = label;
    const content = document.createElement('div');
    content.className = className;
    section.append(heading, content);
    return { section, content, buttons: [] };
  }

  function createButton(label, className, options) {
    options = options || {};
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.setAttribute('aria-label', label);
    button.title = label;
    if (options.showLabel) button.textContent = label;
    return button;
  }

  function resolveIconName(iconKey) {
    const registry = typeof window !== 'undefined' ? window.ZeusIconRegistry : null;
    return registry && typeof registry.resolveFolderVisualIconName === 'function'
      ? registry.resolveFolderVisualIconName(iconKey)
      : 'folder';
  }

  function getFolderVisualHelpers() {
    return typeof window !== 'undefined' ? window.ZeusFolderVisuals : null;
  }

  function getIconRenderer() {
    return typeof window !== 'undefined' ? window.ZeusIconRenderer : null;
  }

  function toLabel(value) {
    return String(value || '').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  const api = { openFolderAppearanceMenu, openFolderAppearanceDialog };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusFolderAppearance = Object.freeze(api);
})();
