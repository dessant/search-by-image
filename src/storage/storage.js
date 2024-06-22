import {capitalizeFirstLetter, lowercaseFirstLetter} from 'utils/common';
import {storageRevisions} from 'utils/config';

async function isStorageArea({area = 'local'} = {}) {
  try {
    await browser.storage[area].get('');
    return true;
  } catch (err) {
    return false;
  }
}

const storageReady = {local: false, session: false, sync: false};
async function isStorageReady({area = 'local'} = {}) {
  if (storageReady[area]) {
    return true;
  } else {
    const {storageVersion} = await browser.storage[area].get('storageVersion');
    if (storageVersion && storageVersion === storageRevisions[area]) {
      storageReady[area] = true;
      return true;
    }
  }

  return false;
}

async function ensureStorageReady({area = 'local'} = {}) {
  if (!storageReady[area]) {
    return new Promise((resolve, reject) => {
      let stop;

      const checkStorage = async function () {
        if (await isStorageReady({area})) {
          self.clearTimeout(timeoutId);
          resolve();
        } else if (stop) {
          reject(new Error(`Storage (${area}) is not ready`));
        } else {
          self.setTimeout(checkStorage, 30);
        }
      };

      const timeoutId = self.setTimeout(function () {
        stop = true;
      }, 60000); // 1 minute

      checkStorage();
    });
  }
}

function processStorageKey(key, contextName, {encode = true} = {}) {
  if (encode) {
    return `${contextName}${capitalizeFirstLetter(key)}`;
  } else {
    return lowercaseFirstLetter(key.replace(new RegExp(`^${contextName}`), ''));
  }
}

function processStorageData(data, contextName, {encode = true} = {}) {
  if (typeof data === 'string') {
    return processStorageKey(data, contextName, {encode});
  } else if (Array.isArray(data)) {
    const items = [];

    for (const item of data) {
      items.push(processStorageKey(item, contextName, {encode}));
    }

    return items;
  } else {
    const items = {};

    for (const [key, value] of Object.entries(data)) {
      items[processStorageKey(key, contextName, {encode})] = value;
    }

    return items;
  }
}

function encodeStorageData(data, context) {
  if (context?.active) {
    return processStorageData(data, context.name, {encode: true});
  }

  return data;
}

function decodeStorageData(data, context) {
  if (context?.active) {
    return processStorageData(data, context.name, {encode: false});
  }

  return data;
}

async function get(keys = null, {area = 'local', context = null} = {}) {
  await ensureStorageReady({area});

  return decodeStorageData(
    await browser.storage[area].get(encodeStorageData(keys, context)),
    context
  );
}

async function set(obj, {area = 'local', context = null} = {}) {
  await ensureStorageReady({area});

  return browser.storage[area].set(encodeStorageData(obj, context));
}

async function remove(keys, {area = 'local', context = null} = {}) {
  await ensureStorageReady({area});

  return browser.storage[area].remove(encodeStorageData(keys, context));
}

async function clear({area = 'local'} = {}) {
  await ensureStorageReady({area});
  return browser.storage[area].clear();
}

export default {get, set, remove, clear};
export {isStorageArea, isStorageReady, encodeStorageData, decodeStorageData};
