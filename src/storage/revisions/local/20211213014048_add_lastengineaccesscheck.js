import browser from 'webextension-polyfill';

const message = 'Add lastEngineAccessCheck';

const revision = '20211213014048_add_lastengineaccesscheck';
const downRevision = '20211204124507_add_wildberries';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {lastEngineAccessCheck: 0};

  changes.storageVersion = revision;
  return storage.set(changes);
}

export {message, revision, upgrade};
