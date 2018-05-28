import browser from 'webextension-polyfill';

const message = 'Add stock photo engines';

const revision = 'r1H3rgx1X';
const downRevision = 'r1Pvd36nz';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {};

  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = [
    'getty',
    'istock',
    'shutterstock',
    'adobestock',
    'depositphotos'
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
    'getty',
    'istock',
    'shutterstock',
    'adobestock',
    'depositphotos'
  ];

  changes.engines = engines.filter(function(item) {
    return !newEngines.includes(item);
  });
  changes.disabledEngines = disabledEngines.filter(function(item) {
    return !newEngines.includes(item);
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
