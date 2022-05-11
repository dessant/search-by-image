const message = 'Add Reddit Repost Sleuth';

const revision = 'K9Esw2jiQ3';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('repostSleuth');
  changes.disabledEngines = disabledEngines.concat('repostSleuth');

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
