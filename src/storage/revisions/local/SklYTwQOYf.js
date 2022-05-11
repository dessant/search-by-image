const message = 'Add SauceNAO';

const revision = 'SklYTwQOYf';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('saucenao');
  changes.disabledEngines = disabledEngines.concat('saucenao');

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
