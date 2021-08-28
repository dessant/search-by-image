import browser from 'webextension-polyfill';
import {migrate} from 'wesa';

import {isStorageArea} from './storage';

async function initStorage({area = 'local'} = {}) {
  const context = require.context('storage', true, /\.(?:js|json)$/i);
  return migrate(context, {area});
}

async function migrateLegacyStorage() {
  if (await isStorageArea({area: 'sync'})) {
    const {storageVersion: syncVersion} = await browser.storage.sync.get(
      'storageVersion'
    );
    if (syncVersion && syncVersion.length < 14) {
      const {storageVersion: localVersion} = await browser.storage.local.get(
        'storageVersion'
      );

      if (!localVersion || localVersion.length < 14) {
        const syncData = await browser.storage.sync.get(null);
        await browser.storage.local.clear();
        await browser.storage.local.set(syncData);
        await browser.storage.sync.clear();
      }
    }
  }
}

export {initStorage, migrateLegacyStorage};
