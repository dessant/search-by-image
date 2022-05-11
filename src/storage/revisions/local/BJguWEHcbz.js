const message = 'Add installTime and searchCount';

const revision = 'BJguWEHcbz';

async function upgrade() {
  const changes = {};
  changes.installTime = Date.now();
  changes.searchCount = 0;

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
