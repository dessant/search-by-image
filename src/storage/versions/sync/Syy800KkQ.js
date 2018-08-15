import browser from 'webextension-polyfill';

const message = 'Add Pinterest';

const revision = 'Syy800KkQ';
const downRevision = 'r1H3rgx1X';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('pinterest');
  changes.disabledEngines = disabledEngines.concat('pinterest');

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
    return item !== 'pinterest';
  });
  changes.disabledEngines = disabledEngines.filter(function(item) {
    return item !== 'pinterest';
  });

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
