import browser from 'webextension-polyfill';

const message = 'Add Ascii2d';

const revision = 'SJzIWmjKz';
const downRevision = 'S18hLi5tG';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('ascii2d');
  changes.disabledEngines = disabledEngines.concat('ascii2d');

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
    return item !== 'ascii2d';
  });
  changes.disabledEngines = disabledEngines.filter(function(item) {
    return item !== 'ascii2d';
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
