import browser from 'webextension-polyfill';

const message = 'Add bypassImageHostBlocking';

const revision = 'UhWEtK9gMh';
const downRevision = 'd8IK4KCtVm';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {};
  changes.bypassImageHostBlocking = true;

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  await storage.remove(['bypassImageHostBlocking']);

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
