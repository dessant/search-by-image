const message = 'Add image sharing options';

const revision = '20210919175209_add_image_sharing_options';

async function upgrade() {
  const changes = {
    shareImageContextMenu: true,
    shareImageAction: true,
    convertSharedImage: true
  };

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
