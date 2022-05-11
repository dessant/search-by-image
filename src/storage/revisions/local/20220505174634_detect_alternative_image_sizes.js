const message = 'Detect alternative image sizes';

const revision = '20220505174634_detect_alternative_image_sizes';

async function upgrade() {
  const changes = {detectAltImageDimension: false};

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
