const message = 'Add searchModeContextMenu';

const revision = 'r1Pvd36nz';
const downRevision = 'SJzIWmjKz';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {
    searchModeContextMenu: 'select' // 'select', 'selectUpload', 'capture'
  };

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};

  await storage.remove('searchModeContextMenu');

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
