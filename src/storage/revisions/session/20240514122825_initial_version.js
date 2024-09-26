const message = 'Initial version';

const revision = '20240514122825_initial_version';

async function upgrade() {
  const changes = {
    platformInfo: null,
    menuChangeEvent: 0,
    privateMenuChangeEvent: 0,
    tabRevisions: []
  };

  changes.storageVersion = revision;
  return browser.storage.session.set(changes);
}

export {message, revision, upgrade};
