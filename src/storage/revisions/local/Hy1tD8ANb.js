const message = 'Add imgFullParse option';

const revision = 'Hy1tD8ANb';

async function upgrade() {
  const changes = {imgFullParse: false};

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
