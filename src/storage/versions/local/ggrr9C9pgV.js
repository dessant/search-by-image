import browser from 'webextension-polyfill';

const message = 'Add new search engines';

const revision = 'ggrr9C9pgV';
const downRevision = 'TshBYj8anA';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = [
    'birchlane',
    'allmodern',
    'jossandmain',
    'perigold',
    'ikea'
  ];

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
  const newEngines = [
    'birchlane',
    'allmodern',
    'jossandmain',
    'perigold',
    'ikea'
  ];

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
