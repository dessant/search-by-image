import {v4 as uuidv4} from 'uuid';
import {
  get as getIDB,
  set as setIDB,
  del as delIDB,
  createStore as createIDBStore
} from 'idb-keyval';
import Queue from 'p-queue';

import storage from 'storage/storage';
import {getTabRevisions} from 'utils/app';
import {targetEnv} from 'utils/config';

const storageQueue = new Queue({concurrency: 1});
const registryQueue = new Queue({concurrency: 1});

class RegistryStore {
  constructor() {
    this.idbStore = null;
    this.memoryStore = null;
  }

  initStore({area = '', force = false} = {}) {
    if (area === 'indexeddb') {
      if (!this.idbStore || force) {
        this.idbStore = createIDBStore('keyval-store', 'keyval');
      }
    } else if (area === 'memory') {
      if (!this.memoryStore) {
        this.memoryStore = {};
      }
    }
  }

  handleError(err, {area = ''} = {}) {
    if (
      area === 'indexeddb' &&
      err?.message?.includes('connection is closing')
    ) {
      console.log('IndexedDB error:', err.message);

      this.initStore({area, force: true});
    } else {
      throw err;
    }
  }

  async get(key, {area = ''} = {}) {
    this.initStore({area});

    if (area === 'indexeddb') {
      try {
        return await getIDB(key, this.idbStore);
      } catch (err) {
        this.handleError(err, {area});
      }
    } else if (area === 'local') {
      return (await storage.get(key))[key];
    } else if (area === 'memory') {
      return this.memoryStore[key];
    }
  }

  async set(key, value, {area = ''} = {}) {
    this.initStore({area});

    if (area === 'indexeddb') {
      try {
        await setIDB(key, value, this.idbStore);
      } catch (err) {
        this.handleError(err, {area});

        await setIDB(key, value, this.idbStore);
      }
    } else if (area === 'local') {
      await storage.set({[key]: value});
    } else if (area === 'memory') {
      this.memoryStore[key] = value;
    }
  }

  async remove(key, {area = ''} = {}) {
    this.initStore({area});

    if (area === 'indexeddb') {
      try {
        await delIDB(key, this.idbStore);
      } catch (err) {
        this.handleError(err, {area});
      }
    } else if (area === 'local') {
      await storage.remove(key);
    } else if (area === 'memory') {
      delete this.memoryStore[key];
    }
  }
}

const registryStore = new RegistryStore();

function getStorageItemKeys(storageId) {
  return {metadataKey: `metadata_${storageId}`, dataKey: `data_${storageId}`};
}

async function _getStorageItem({
  storageId,
  metadata = false,
  data = false,
  area = 'local'
} = {}) {
  const {metadataKey, dataKey} = getStorageItemKeys(storageId);

  if (metadata) {
    ({value: metadata} =
      (await registryStore.get(metadataKey, {area: 'local'})) || {});
  }

  if (data) {
    ({value: data} = (await registryStore.get(dataKey, {area})) || {});
  }

  return {metadata, data};
}

async function _setStorageItem({
  storageId,
  metadata = null,
  data = null,
  area = 'local'
} = {}) {
  const {metadataKey, dataKey} = getStorageItemKeys(storageId);

  if (metadata !== null) {
    await registryStore.set(metadataKey, {value: metadata}, {area: 'local'});
  }

  if (data !== null) {
    await registryStore.set(dataKey, {value: data}, {area});
  }
}

async function _removeStorageItem({
  storageId,
  metadata = false,
  data = false,
  area = 'local'
} = {}) {
  const {metadataKey, dataKey} = getStorageItemKeys(storageId);

  if (metadata) {
    await registryStore.remove(metadataKey, {area: 'local'});
  }

  if (data) {
    await registryStore.remove(dataKey, {area});
  }
}

async function addStorageItem(
  data,
  {
    token = '',
    receipts = null,
    expiryTime = 0,
    area = 'local',
    isTask = false
  } = {}
) {
  const storageId = token || uuidv4();
  const addTime = Date.now();
  const metadata = {area, addTime, receipts, alarms: [], isTask};

  if (expiryTime) {
    const alarmName = `delete-storage-item_${storageId}`;
    browser.alarms.create(alarmName, {delayInMinutes: expiryTime});

    metadata.alarms.push(alarmName);
  }

  await addStorageRegistryItem({storageId, addTime});

  await _setStorageItem({storageId, metadata, data, area});

  return storageId;
}

async function getStorageItem({storageId, saveReceipt = false} = {}) {
  const {metadata} = await _getStorageItem({storageId, metadata: true});

  if (metadata) {
    const {data} = await _getStorageItem({
      storageId,
      data: true,
      area: metadata.area
    });

    if (data) {
      if (saveReceipt) {
        await saveStorageItemReceipt({storageId});
      }

      return data;
    }
  }
}

async function deleteStorageItem({storageId, registry = true} = {}) {
  const {metadata} = await _getStorageItem({storageId, metadata: true});

  if (metadata) {
    await _removeStorageItem({storageId, data: true, area: metadata.area});

    for (const alarmName of metadata.alarms) {
      await browser.alarms.clear(alarmName);
    }

    await _removeStorageItem({storageId, metadata: true});

    if (registry) {
      if (metadata.isTask) {
        await deleteTaskRegistryItem({taskId: storageId});
      }

      await deleteStorageRegistryItem({storageId});
    }
  }
}

async function saveStorageItemReceipt({storageId} = {}) {
  await storageQueue.add(async function () {
    const {metadata} = await _getStorageItem({storageId, metadata: true});

    if (metadata && metadata.receipts) {
      metadata.receipts.received += 1;

      if (metadata.receipts.received < metadata.receipts.expected) {
        await _setStorageItem({storageId, metadata});
      } else {
        await deleteStorageItem({storageId});
      }
    }
  });
}

async function addStorageRegistryItem({storageId, addTime} = {}) {
  await registryQueue.add(async function () {
    const {storageRegistry} = await storage.get('storageRegistry');
    storageRegistry[storageId] = {addTime};

    await storage.set({storageRegistry});
  });
}

async function deleteStorageRegistryItem({storageId} = {}) {
  await registryQueue.add(async function () {
    const {storageRegistry} = await storage.get('storageRegistry');
    delete storageRegistry[storageId];

    await storage.set({storageRegistry});
  });
}

async function addTaskRegistryItem({taskId, tabId} = {}) {
  await registryQueue.add(async function () {
    const {taskRegistry} = await storage.get('taskRegistry');
    const addTime = Date.now();

    taskRegistry.lastTaskStart = addTime;
    taskRegistry.tabs[tabId] = {taskId};
    taskRegistry.tasks[taskId] = {tabId, addTime};

    await storage.set({taskRegistry});
  });
}

async function getTaskRegistryItem({taskId, tabId} = {}) {
  const {taskRegistry} = await storage.get('taskRegistry');

  if (tabId) {
    let tab = taskRegistry.tabs[tabId];

    if (!tab && ['safari'].includes(targetEnv)) {
      const tabRevisions = await getTabRevisions(tabId);

      if (tabRevisions) {
        for (const revision of tabRevisions) {
          tab = taskRegistry.tabs[revision];

          if (tab) {
            break;
          }
        }
      }
    }

    if (tab) {
      return {
        taskId: tab.taskId,
        ...taskRegistry.tasks[tab.taskId]
      };
    }
  } else if (taskId) {
    const task = taskRegistry.tasks[taskId];

    if (task) {
      return {taskId, ...task};
    }
  }
}

async function deleteTaskRegistryItem({taskId} = {}) {
  await registryQueue.add(async function () {
    const {taskRegistry} = await storage.get('taskRegistry');
    const taskIndex = taskRegistry.tasks[taskId];

    if (taskIndex) {
      const tabIndex = taskRegistry.tabs[taskIndex.tabId];
      if (tabIndex && tabIndex.taskId === taskId) {
        delete taskRegistry.tabs[taskIndex.tabId];
      }
    }

    delete taskRegistry.tasks[taskId];

    await storage.set({taskRegistry});
  });
}

async function cleanupRegistry() {
  await registryQueue.add(async function () {
    const {lastStorageCleanup} = await storage.get('lastStorageCleanup');
    // run at most once a day
    if (Date.now() - lastStorageCleanup > 86400000) {
      const {taskRegistry} = await storage.get('taskRegistry');

      for (const [taskId, taskIndex] of Object.entries(taskRegistry.tasks)) {
        // remove tasks older than 1 hour
        if (Date.now() - taskIndex.addTime > 3600000) {
          const tabIndex = taskRegistry.tabs[taskIndex.tabId];
          if (tabIndex && tabIndex.taskId === taskId) {
            delete taskRegistry.tabs[taskIndex.tabId];
          }

          delete taskRegistry.tasks[taskId];
        }
      }

      await storage.set({taskRegistry});

      const {storageRegistry} = await storage.get('storageRegistry');

      for (const [storageId, storageIndex] of Object.entries(storageRegistry)) {
        // remove storage items older than 1 hour
        if (Date.now() - storageIndex.addTime > 3600000) {
          await deleteStorageItem({storageId, registry: false});

          delete storageRegistry[storageId];
        }
      }

      await storage.set({storageRegistry, lastStorageCleanup: Date.now()});
    }
  });
}

export default {
  addStorageItem,
  getStorageItem,
  deleteStorageItem,
  saveStorageItemReceipt,
  addTaskRegistryItem,
  getTaskRegistryItem,
  cleanupRegistry
};
