const message = 'Update search mode IDs';

const revision = '20220516051842_update_search_mode_ids';

async function upgrade() {
  const changes = {};

  const {searchModeContextMenu, searchModeAction} =
    await browser.storage.local.get([
      'searchModeContextMenu',
      'searchModeAction'
    ]);

  const searchModes = {
    select: 'selectUrl',
    selectUpload: 'selectImage',
    upload: 'browse'
  };

  if (searchModes[searchModeContextMenu]) {
    changes.searchModeContextMenu = searchModes[searchModeContextMenu];
  }
  if (searchModes[searchModeAction]) {
    changes.searchModeAction = searchModes[searchModeAction];
  }

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
