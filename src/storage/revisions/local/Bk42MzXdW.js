const message = 'Merge searchAllEngines options';

const revision = 'Bk42MzXdW';

async function upgrade() {
  const changes = {};

  const {searchAllEngines, searchAllEnginesLocation} =
    await browser.storage.local.get([
      'searchAllEngines',
      'searchAllEnginesLocation'
    ]);

  await browser.storage.local.remove([
    'searchAllEngines',
    'searchAllEnginesLocation'
  ]);

  if (searchAllEngines) {
    changes.searchAllEnginesContextMenu =
      searchAllEnginesLocation === 'menu' ? 'main' : 'sub';
  } else {
    changes.searchAllEnginesContextMenu = 'false';
  }

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
