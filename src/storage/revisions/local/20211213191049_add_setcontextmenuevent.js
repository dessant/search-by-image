const message = 'Add setContextMenuEvent';

const revision = '20211213191049_add_setcontextmenuevent';

async function upgrade() {
  const changes = {setContextMenuEvent: 0};

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
