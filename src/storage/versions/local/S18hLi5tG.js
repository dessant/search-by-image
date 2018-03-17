import browser from 'webextension-polyfill';

const message = 'Add Iqdb';

const revision = 'S18hLi5tG';
const downRevision = 'SklYTwQOYf';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('iqdb');
  changes.disabledEngines = disabledEngines.concat('iqdb');

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
    return item !== 'iqdb';
  });
  changes.disabledEngines = disabledEngines.filter(function(item) {
    return item !== 'iqdb';
  });

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

module.exports = {
  message,
  revision,
  upgrade,
  downgrade
};
