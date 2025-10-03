const message = 'Add VCG';

const revision = '20251003185932_add_vcg';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = ['vcg'];

  changes.engines = engines.concat(newEngines);
  changes.disabledEngines = disabledEngines.concat(newEngines);

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
