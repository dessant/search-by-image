const message = 'Support event pages';

const revision = '20210820184257_support_event_pages';

async function upgrade() {
  const changes = {};

  changes.taskRegistry = {lastTaskStart: 0, tabs: {}, tasks: {}};
  changes.storageRegistry = {};
  changes.lastStorageCleanup = 0;

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
