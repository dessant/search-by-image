import browser from 'webextension-polyfill';

const message = 'Add Karma Decay';

const revision = 'S1ebtZ3Uzz';
const downRevision = 'BJguWEHcbz';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('karmaDecay');
  changes.disabledEngines = disabledEngines.concat('karmaDecay');

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
    return item !== 'karmaDecay';
  });
  changes.disabledEngines = disabledEngines.filter(function(item) {
    return item !== 'karmaDecay';
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
