import browser from 'webextension-polyfill';

const message = 'Add image sharing options';

const revision = '20210919175209_add_image_sharing_options';
const downRevision = '20210820184257_support_event_pages';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {
    shareImageContextMenu: true,
    shareImageAction: true,
    convertSharedImage: true
  };

  changes.storageVersion = revision;
  return storage.set(changes);
}

export {message, revision, upgrade};
