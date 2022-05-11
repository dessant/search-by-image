const message = 'Add searchModeContextMenu';

const revision = 'r1Pvd36nz';

async function upgrade() {
  const changes = {
    searchModeContextMenu: 'select' // 'select', 'selectUpload', 'capture'
  };

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
