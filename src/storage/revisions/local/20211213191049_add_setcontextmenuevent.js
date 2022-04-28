const message = 'Add setContextMenuEvent';

const revision = '20211213191049_add_setcontextmenuevent';
const downRevision = '20211213014048_add_lastengineaccesscheck';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {setContextMenuEvent: 0};

  changes.storageVersion = revision;
  return storage.set(changes);
}

export {message, revision, upgrade};
