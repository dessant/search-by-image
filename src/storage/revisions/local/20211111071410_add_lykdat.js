import browser from 'webextension-polyfill';

const message = 'Add LykDat';

const revision = '20211111071410_add_lykdat';
const downRevision = '20211106103932_add_shein';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = ['lykdat'];

  changes.engines = engines.concat(newEngines);
  changes.disabledEngines = disabledEngines.concat(newEngines);

  changes.storageVersion = revision;
  return storage.set(changes);
}

export {message, revision, upgrade};
