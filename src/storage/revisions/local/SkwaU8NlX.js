const message = 'Add Qihoo';

const revision = 'SkwaU8NlX';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('qihoo');
  changes.disabledEngines = disabledEngines.concat('qihoo');

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
