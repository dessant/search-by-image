const message =
  'Add showInContextMenu, searchAllEnginesAction and searchModeAction options';

const revision = 'HJ5MKKGhW';

async function upgrade() {
  const changes = {
    showInContextMenu: true,
    searchAllEnginesAction: 'sub', // 'main', 'sub', 'false'
    searchModeAction: 'select' // 'select', 'selectUpload', 'capture', 'upload', 'url'
  };

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
