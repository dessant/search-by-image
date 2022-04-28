const message = 'Add Reddit Repost Sleuth';

const revision = 'K9Esw2jiQ3';
const downRevision = 'IMMjiccGj';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('repostSleuth');
  changes.disabledEngines = disabledEngines.concat('repostSleuth');

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
    return item !== 'repostSleuth';
  });
  changes.disabledEngines = disabledEngines.filter(function (item) {
    return item !== 'repostSleuth';
  });

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
