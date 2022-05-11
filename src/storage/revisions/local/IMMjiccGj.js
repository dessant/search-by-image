const message = 'Hide unavailable engines';

const revision = 'IMMjiccGj';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);
  const missingEngines = [
    'wayfair',
    'birchlane',
    'allmodern',
    'jossandmain',
    'perigold'
  ];

  changes.engines = engines.filter(function (item) {
    return !missingEngines.includes(item);
  });
  changes.disabledEngines = disabledEngines.filter(function (item) {
    return !missingEngines.includes(item);
  });

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
