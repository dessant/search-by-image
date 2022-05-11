const message = 'Add bypassImageHostBlocking';

const revision = 'UhWEtK9gMh';

async function upgrade() {
  const changes = {};
  changes.bypassImageHostBlocking = true;

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
