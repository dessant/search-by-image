const message = 'Add yandexHost';

const revision = '20251203085001_add_yandexhost';

async function upgrade() {
  const changes = {};

  changes.yandexHost = 'yandex_com';

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
