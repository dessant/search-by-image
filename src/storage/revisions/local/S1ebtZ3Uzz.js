const message = 'Add Karma Decay';

const revision = 'S1ebtZ3Uzz';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('karmaDecay');
  changes.disabledEngines = disabledEngines.concat('karmaDecay');

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
