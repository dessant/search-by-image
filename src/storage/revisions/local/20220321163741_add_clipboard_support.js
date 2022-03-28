import browser from 'webextension-polyfill';

const message = 'Add clipboard support';

const revision = '20220321163741_add_clipboard_support';
const downRevision = '20220108063511_add_google_lens';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {
    autoPasteAction: true,
    confirmPaste: true
  };

  changes.storageVersion = revision;
  return storage.set(changes);
}

export {message, revision, upgrade};
