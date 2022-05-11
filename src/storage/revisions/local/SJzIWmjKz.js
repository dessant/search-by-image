const message = 'Add Ascii2d';

const revision = 'SJzIWmjKz';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('ascii2d');
  changes.disabledEngines = disabledEngines.concat('ascii2d');

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
