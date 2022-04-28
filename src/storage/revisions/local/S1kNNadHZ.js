const message = 'Add Sogou engine';

const revision = 'S1kNNadHZ';
const downRevision = 'Hy1tD8ANb';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('sogou');
  changes.disabledEngines = disabledEngines.concat('sogou');

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.filter(function (item) {
    return item !== 'sogou';
  });
  changes.disabledEngines = disabledEngines.filter(function (item) {
    return item !== 'sogou';
  });

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
