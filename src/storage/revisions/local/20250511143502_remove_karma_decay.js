const message = 'Remove Karma Decay';

const revision = '20250511143502_remove_karma_decay';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  const removeEngines = ['karmaDecay'];

  changes.engines = engines.filter(function (item) {
    return !removeEngines.includes(item);
  });
  changes.disabledEngines = disabledEngines.filter(function (item) {
    return !removeEngines.includes(item);
  });

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
