import browser from 'webextension-polyfill';

const message = 'Support event pages';

const revision = '20210820184257_support_event_pages';
const downRevision = 'K9Esw2jiQ3';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};

  changes.taskRegistry = {lastTaskStart: 0, tabs: {}, tasks: {}};
  changes.storageRegistry = {};
  changes.lastStorageCleanup = 0;

  changes.storageVersion = revision;
  return storage.set(changes);
}

export {message, revision, upgrade};
