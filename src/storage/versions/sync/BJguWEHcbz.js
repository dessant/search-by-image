import browser from 'webextension-polyfill';

const message = 'Add installTime and searchCount';

const revision = 'BJguWEHcbz';
const downRevision = 'ryY8H0EWf';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {};
  changes.installTime = new Date().getTime();
  changes.searchCount = 0;

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  await storage.remove(['installTime', 'searchCount']);

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

module.exports = {
  message,
  revision,
  upgrade,
  downgrade
};
