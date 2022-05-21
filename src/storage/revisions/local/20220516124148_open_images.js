const message = 'Open images';

const revision = '20220516124148_open_images';

async function upgrade() {
  const changes = {
    viewImageContextMenu: true,
    viewImageAction: true,
    viewImageUseViewer: true
  };

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
