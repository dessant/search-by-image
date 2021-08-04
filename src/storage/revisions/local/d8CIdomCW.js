import browser from 'webextension-polyfill';

const message = 'Add PimEyes, Stocksy United, Pond5, PIXTA and Wayfair';

const revision = 'd8CIdomCW';
const downRevision = 'LX20x6G8l';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = ['pimeyes', 'stocksy', 'pond5', 'pixta', 'wayfair'];

  changes.engines = engines.concat(newEngines);
  changes.disabledEngines = disabledEngines.concat(newEngines);

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = ['pimeyes', 'stocksy', 'pond5', 'pixta', 'wayfair'];

  changes.engines = engines.filter(function (item) {
    return !newEngines.includes(item);
  });
  changes.disabledEngines = disabledEngines.filter(function (item) {
    return !newEngines.includes(item);
  });

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
