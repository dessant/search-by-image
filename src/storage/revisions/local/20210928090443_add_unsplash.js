import browser from 'webextension-polyfill';

const message = 'Add Unsplash';

const revision = '20210928090443_add_unsplash';
const downRevision = '20210919175209_add_image_sharing_options';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = ['unsplash'];

  changes.engines = engines.concat(newEngines);
  changes.disabledEngines = disabledEngines.concat(newEngines);

  changes.storageVersion = revision;
  return storage.set(changes);
}

export {message, revision, upgrade};
