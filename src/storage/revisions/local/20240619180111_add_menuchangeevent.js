const message = 'Add menuChangeEvent';

const revision = '20240619180111_add_menuchangeevent';

async function upgrade() {
  const changes = {
    menuChangeEvent: 0,
    privateMenuChangeEvent: 0
  };

  await browser.storage.local.remove('setContextMenuEvent');

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
