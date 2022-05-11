const message = 'Add Pinterest';

const revision = 'Syy800KkQ';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('pinterest');
  changes.disabledEngines = disabledEngines.concat('pinterest');

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
