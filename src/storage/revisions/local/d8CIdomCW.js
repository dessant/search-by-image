const message = 'Add PimEyes, Stocksy United, Pond5, PIXTA and Wayfair';

const revision = 'd8CIdomCW';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = ['pimeyes', 'stocksy', 'pond5', 'pixta', 'wayfair'];

  changes.engines = engines.concat(newEngines);
  changes.disabledEngines = disabledEngines.concat(newEngines);

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
