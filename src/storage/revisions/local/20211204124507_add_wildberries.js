import browser from 'webextension-polyfill';

const message = 'Add Wildberries';

const revision = '20211204124507_add_wildberries';
const downRevision = '20211111071410_add_lykdat';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = ['wildberries'];

  changes.engines = engines.concat(newEngines);
  changes.disabledEngines = disabledEngines.concat(newEngines);

  changes.storageVersion = revision;
  return storage.set(changes);
}

export {message, revision, upgrade};
