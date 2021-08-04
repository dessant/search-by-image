import browser from 'webextension-polyfill';

const message = 'Add contribPageLastOpen';

const revision = 'ryY8H0EWf';
const downRevision = 'HJ5MKKGhW';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {};
  changes.contribPageLastOpen = 0;

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  await storage.remove(['contribPageLastOpen']);

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
