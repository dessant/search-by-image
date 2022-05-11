const message = 'Add Iqdb';

const revision = 'S18hLi5tG';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('iqdb');
  changes.disabledEngines = disabledEngines.concat('iqdb');

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
