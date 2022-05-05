import browser from 'webextension-polyfill';

const message = 'Detect alternative image sizes';

const revision = '20220505174634_detect_alternative_image_sizes';
const downRevision = '20220321163741_add_clipboard_support';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {detectAltImageDimension: false};

  changes.storageVersion = revision;
  return storage.set(changes);
}

export {message, revision, upgrade};
