import browser from 'webextension-polyfill';

import migrate from './migration/migrate';

// Firefox 52
var syncArea;
async function detectSyncSupport() {
  try {
    await browser.storage.sync.get('');
    syncArea = true;
  } catch (e) {
    syncArea = false;
  }
}

async function init(area = 'local') {
  if (typeof syncArea === 'undefined') {
    await detectSyncSupport();
  }
  area = syncArea ? area : 'local';

  return migrate.reconcile(area);
}

async function get(keys = null, area = 'local') {
  if (typeof syncArea === 'undefined') {
    await detectSyncSupport();
  }
  area = syncArea ? area : 'local';

  return browser.storage[area].get(keys);
}

async function set(obj, area = 'local') {
  if (typeof syncArea === 'undefined') {
    await detectSyncSupport();
  }
  area = syncArea ? area : 'local';

  return browser.storage[area].set(obj);
}

async function remove(keys, area = 'local') {
  if (typeof syncArea === 'undefined') {
    await detectSyncSupport();
  }
  area = syncArea ? area : 'local';

  return browser.storage[area].remove(keys);
}

async function clear(area = 'local') {
  if (typeof syncArea === 'undefined') {
    await detectSyncSupport();
  }
  area = syncArea ? area : 'local';

  return browser.storage[area].clear();
}

module.exports = {
  init,
  get,
  set,
  remove,
  clear
};
