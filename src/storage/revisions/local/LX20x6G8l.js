const message = 'Add trademark and design patent search engines';

const revision = 'LX20x6G8l';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = [
    'esearch',
    'tmview',
    'branddb',
    'madridMonitor',
    'auTrademark',
    'auDesign',
    'nzTrademark',
    'jpDesign'
  ];

  changes.engines = engines.concat(newEngines);
  changes.disabledEngines = disabledEngines.concat(newEngines);

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
