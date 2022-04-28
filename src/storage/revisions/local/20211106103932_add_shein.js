const message = 'Add SHEIN';

const revision = '20211106103932_add_shein';
const downRevision = '20211011114043_configure_engines';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = ['shein'];

  changes.engines = engines.concat(newEngines);
  changes.disabledEngines = disabledEngines.concat(newEngines);

  changes.storageVersion = revision;
  return storage.set(changes);
}

export {message, revision, upgrade};
