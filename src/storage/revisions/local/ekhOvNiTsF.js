import browser from 'webextension-polyfill';

const message = 'Add Mail.ru';

const revision = 'ekhOvNiTsF';
const downRevision = 'yLciyvS5He';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('mailru');
  changes.disabledEngines = disabledEngines.concat('mailru');

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.filter(function(item) {
    return item !== 'mailru';
  });
  changes.disabledEngines = disabledEngines.filter(function(item) {
    return item !== 'mailru';
  });

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
