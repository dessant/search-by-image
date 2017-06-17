import migrate from './migration/migrate';

async function init(area = 'local') {
  return migrate.reconcile(area);
}

async function get(keys = null, area = 'local') {
  return browser.storage[area].get(keys);
}

async function set(obj, area = 'local') {
  return browser.storage[area].set(obj);
}

async function remove(keys, area = 'local') {
  return browser.storage[area].remove(keys);
}

async function clear(area = 'local') {
  return browser.storage[area].clear();
}

module.exports = {
  init,
  get,
  set,
  remove,
  clear
};
