const message = 'Merge searchAllEngines options';

const revision = 'Bk42MzXdW';
const downRevision = 'S1kNNadHZ';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {};

  const {searchAllEngines, searchAllEnginesLocation} = await storage.get([
    'searchAllEngines',
    'searchAllEnginesLocation'
  ]);

  await storage.remove(['searchAllEngines', 'searchAllEnginesLocation']);

  if (searchAllEngines) {
    changes.searchAllEnginesContextMenu =
      searchAllEnginesLocation === 'menu' ? 'main' : 'sub';
  } else {
    changes.searchAllEnginesContextMenu = 'false';
  }

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};

  const {searchAllEnginesContextMenu} = await storage.get([
    'searchAllEnginesContextMenu'
  ]);

  await storage.remove('searchAllEnginesContextMenu');

  if (searchAllEnginesContextMenu === 'false') {
    changes.searchAllEngines = false;
    changes.searchAllEnginesLocation = 'sub';
  } else {
    changes.searchAllEngines = true;
    changes.searchAllEnginesLocation =
      searchAllEnginesContextMenu === 'main' ? 'menu' : 'submenu';
  }

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

module.exports = {
  message,
  revision,
  upgrade,
  downgrade
};
