const message = 'Add lastEngineAccessCheck';

const revision = '20211213014048_add_lastengineaccesscheck';

async function upgrade() {
  const changes = {lastEngineAccessCheck: 0};

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
