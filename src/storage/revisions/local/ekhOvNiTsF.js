const message = 'Add Mail.ru';

const revision = 'ekhOvNiTsF';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('mailru');
  changes.disabledEngines = disabledEngines.concat('mailru');

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
