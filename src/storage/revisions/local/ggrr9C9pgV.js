const message = 'Add new search engines';

const revision = 'ggrr9C9pgV';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = [
    'birchlane',
    'allmodern',
    'jossandmain',
    'perigold',
    'ikea'
  ];

  changes.engines = engines.concat(newEngines);
  changes.disabledEngines = disabledEngines.concat(newEngines);

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
