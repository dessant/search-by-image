var message = 'Initial version';

var revision = 'ryekyizAg';
var downRevision = null;

var storage = browser.storage.local;

async function upgrade() {
  var changes = {
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

module.exports = {
  message,
  revision,
  upgrade,
  downgrade
};
