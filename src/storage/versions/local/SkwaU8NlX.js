import browser from 'webextension-polyfill';

const message = 'Add Qihoo';

const revision = 'SkwaU8NlX';
const downRevision = 'Syy800KkQ';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('qihoo');
  changes.disabledEngines = disabledEngines.concat('qihoo');

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
    return item !== 'qihoo';
  });
  changes.disabledEngines = disabledEngines.filter(function(item) {
    return item !== 'qihoo';
  });

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
