const message = 'Add Lenso.ai';

const revision = '20250102095603_add_lenso.ai';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngine = 'lenso';

  const enabledEngineCount = engines.length - disabledEngines.length;

  engines.splice(1, 0, newEngine);
  changes.engines = engines;

  if (enabledEngineCount <= 1) {
    disabledEngines.push(newEngine);
  }
  if (enabledEngineCount === 8 && !disabledEngines.includes('alamy')) {
    disabledEngines.push('alamy');
  }
  changes.disabledEngines = disabledEngines;

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
