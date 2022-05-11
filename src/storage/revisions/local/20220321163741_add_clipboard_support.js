const message = 'Add clipboard support';

const revision = '20220321163741_add_clipboard_support';

async function upgrade() {
  const changes = {
    autoPasteAction: true,
    confirmPaste: true
  };

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
