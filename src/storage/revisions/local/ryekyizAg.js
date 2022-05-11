const message = 'Initial version';

const revision = 'ryekyizAg';

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
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
