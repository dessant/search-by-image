const message = 'Add Sogou engine';

const revision = 'S1kNNadHZ';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('sogou');
  changes.disabledEngines = disabledEngines.concat('sogou');

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
