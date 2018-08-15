import browser from 'webextension-polyfill';

const message = 'Add SauceNAO';

const revision = 'SklYTwQOYf';
const downRevision = 'BJXdcUXOG';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('saucenao');
  changes.disabledEngines = disabledEngines.concat('saucenao');

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.filter(function(item) {
    return item !== 'saucenao';
  });
  changes.disabledEngines = disabledEngines.filter(function(item) {
    return item !== 'saucenao';
  });

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
