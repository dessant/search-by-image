const message = 'Add imgFullParse option';

const revision = 'Hy1tD8ANb';
const downRevision = 'ryekyizAg';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {imgFullParse: false};

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  await storage.remove('imgFullParse');

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
