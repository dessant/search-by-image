import browser from 'webextension-polyfill';

const message = 'Initial version';

const revision = 'ryekyizAg';
const downRevision = null;

const storage = browser.storage.local;

async function upgrade() {
  const changes = {
    engines: ['google', 'bing', 'yandex', 'baidu', 'tineye'],
    disabledEngines: [],
    searchAllEngines: true,
    searchAllEnginesLocation: 'submenu', // 'menu', 'submenu'
    tabInBackgound: false,
    localGoogle: true
  };

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  return storage.clear();
}

export {message, revision, upgrade, downgrade};
