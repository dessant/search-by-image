import browser from 'webextension-polyfill';

const message =
  'Add showInContextMenu, searchAllEnginesAction and searchModeAction options';

const revision = 'HJ5MKKGhW';
const downRevision = 'Bk42MzXdW';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {
    showInContextMenu: true,
    searchAllEnginesAction: 'sub', // 'main', 'sub', 'false'
    searchModeAction: 'select' // 'select', 'selectUpload', 'capture', 'upload', 'url'
  };

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  await storage.remove([
    'showInContextMenu',
    'searchAllEnginesAction',
    'searchModeAction'
  ]);

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
