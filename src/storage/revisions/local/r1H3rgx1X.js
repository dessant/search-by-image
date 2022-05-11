const message = 'Add stock photo engines';

const revision = 'r1H3rgx1X';

async function upgrade() {
  const changes = {};

  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = [
    'getty',
    'istock',
    'shutterstock',
    'adobestock',
    'depositphotos'
  ];

  changes.engines = engines.concat(newEngines);
  changes.disabledEngines = disabledEngines.concat(newEngines);

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
