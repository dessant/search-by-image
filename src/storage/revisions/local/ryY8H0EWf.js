const message = 'Add contribPageLastOpen';

const revision = 'ryY8H0EWf';

async function upgrade() {
  const changes = {};
  changes.contribPageLastOpen = 0;

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
