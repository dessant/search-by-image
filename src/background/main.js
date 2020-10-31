import browser from 'webextension-polyfill';
import {v4 as uuidv4} from 'uuid';

import {initStorage} from 'storage/init';
import storage from 'storage/storage';
import {
  getText,
  createTab,
  executeCode,
  executeFile,
  scriptsAllowed,
  onComplete,
  dataUrlToBlob,
  isAndroid,
  getActiveTab,
  getPlatform
} from 'utils/common';
import {
  getEnabledEngines,
  getSupportedEngines,
  getSearches,
  showNotification,
  showContributePage,
  normalizeFilename,
  captureVisibleTabArea,
  validateUrl
} from 'utils/app';
import {optionKeys, engines, chromeMobileUA, chromeDesktopUA} from 'utils/data';
import {targetEnv} from 'utils/config';

const dataStorage = {};

function addStorageItem(
  data,
  {deleteFn, receipts = null, expiryTime = 0} = {}
) {
  const storageKey = uuidv4();
  dataStorage[storageKey] = {data, deleteFn, receipts};

  if (expiryTime) {
    window.setTimeout(function () {
      deleteStorageItem(storageKey);
    }, expiryTime);
  }

  return storageKey;
}

function getStorageItem(storageKey, {saveReceipts = true} = {}) {
  const storedData = dataStorage[storageKey];
  if (storedData) {
    if (saveReceipts && storedData.receipts) {
      storedData.receipts.received += 1;
      if (storedData.receipts.expected === storedData.receipts.received) {
        deleteStorageItem(storageKey);
      }
    }

    return storedData.data;
  }
}

function updateStorageItem(storageKey, data) {
  const storedData = dataStorage[storageKey];
  if (storedData) {
    Object.assign(storedData.data, data);
  } else {
    throw new Error('storage item does not exist');
  }

  return storedData;
}

function deleteStorageItem(storageKey) {
  const storedData = dataStorage[storageKey];
  if (storedData) {
    if (storedData.deleteFn) {
      storedData.deleteFn(storedData.data);
    }
    delete dataStorage[storageKey];
    return storedData.data;
  }
}

function getEngineMenuIcons(engine) {
  if (['iqdb', 'karmaDecay', 'tineye', 'whatanime'].includes(engine)) {
    return {
      16: `src/icons/engines/${engine}-16.png`,
      32: `src/icons/engines/${engine}-32.png`
    };
  } else {
    if (['branddb', 'madridMonitor'].includes(engine)) {
      engine = 'wipo';
    }
    return {
      16: `src/icons/engines/${engine}.svg`
    };
  }
}

function createMenuItem({
  id,
  title = '',
  contexts,
  parent,
  type = 'normal',
  urlPatterns,
  icons
}) {
  const params = {
    id,
    title,
    contexts,
    documentUrlPatterns: urlPatterns,
    parentId: parent,
    type
  };
  if (icons && targetEnv === 'firefox') {
    params.icons = icons;
  }
  browser.contextMenus.create(params, onComplete);
}

async function createMenu(options) {
  const enEngines = await getEnabledEngines(options);
  const contexts = [
    'audio',
    'editable',
    'frame',
    'image',
    'link',
    'selection',
    'video'
  ];
  if (!(await isAndroid())) {
    contexts.push('page');
  }
  const urlPatterns = ['http://*/*', 'https://*/*'];
  let setIcons = false;
  if (targetEnv === 'firefox') {
    urlPatterns.push('file:///*');
    setIcons = true;
  }

  if (enEngines.length === 1) {
    const engine = enEngines[0];
    createMenuItem({
      id: engine,
      title: getText(
        'mainMenuItemTitle_engine',
        getText(`menuItemTitle_${engine}`)
      ),
      contexts,
      urlPatterns
    });
    return;
  }

  if (enEngines.length > 1) {
    const searchAllEngines = options.searchAllEnginesContextMenu;

    if (searchAllEngines === 'main') {
      createMenuItem({
        id: 'allEngines',
        title: getText('mainMenuItemTitle_allEngines'),
        contexts,
        urlPatterns
      });
      return;
    }

    if (searchAllEngines === 'sub') {
      createMenuItem({
        id: 'allEngines',
        title: getText('menuItemTitle_allEngines'),
        contexts,
        urlPatterns,
        icons: setIcons && getEngineMenuIcons('allEngines')
      });
      createMenuItem({
        id: 'sep-1',
        contexts,
        type: 'separator',
        urlPatterns
      });
    }

    enEngines.forEach(function (engine) {
      createMenuItem({
        id: engine,
        title: getText(`menuItemTitle_${engine}`),
        contexts,
        urlPatterns,
        icons: setIcons && getEngineMenuIcons(engine)
      });
    });
  }
}

async function getTabUrl(task, search, image, sessionKey) {
  const engine = search.engine;
  let tabUrl = engines[engine][search.method].target;

  if (sessionKey) {
    tabUrl = tabUrl.replace('{sessionKey}', sessionKey);
  }

  if (!search.isExec && !search.isSessionKey) {
    let imgUrl = image.imageUrl;
    if (engine !== 'ascii2d') {
      imgUrl = encodeURIComponent(imgUrl);
    }
    tabUrl = tabUrl.replace('{imgUrl}', imgUrl);
    if (engine === 'google' && !task.options.localGoogle) {
      tabUrl = `${tabUrl}&gws_rd=cr&gl=US`;
    }
  }

  return tabUrl;
}

async function searchImage(task, image, firstBatchItem = true) {
  let tabActive = firstBatchItem;

  let contributePageTabId;
  if (firstBatchItem) {
    let {searchCount} = await storage.get('searchCount', 'sync');
    searchCount += 1;
    await storage.set({searchCount}, 'sync');
    if ([10, 100].includes(searchCount)) {
      const tab = await showContributePage('search');
      contributePageTabId = tab.id;
      task.sourceTabIndex += 1;
      tabActive = false;
    }
  }

  tabActive = !task.options.tabInBackgound && tabActive;

  if (image.hasOwnProperty('imageDataUrl') && !image.imageSize) {
    const blob = dataUrlToBlob(image.imageDataUrl);
    image.imageSize = blob.size;
  }

  const supportedEngines = await getSupportedEngines(image, task.engines);
  const unsupportedEngines = task.engines.filter(
    item => !supportedEngines.includes(item)
  );
  if (unsupportedEngines.length) {
    await showNotification({
      messageId: 'error_invalidSearchMethod',
      type: 'unsupportedError'
    });
  }

  const searches = await getSearches(image, supportedEngines);

  const receiptSearches = searches.filter(item => item.sendsReceipt);
  receiptSearches.forEach(item => {
    if (image.imageSize) {
      item.imageSize = image.imageSize;
    }
  });

  const imageKey = addStorageItem(image, {
    receipts: {expected: receiptSearches.length || 1, received: 0},
    expiryTime: 600000 // 10 minutes
  });

  let firstEngine = firstBatchItem;
  for (const search of searches) {
    task.sourceTabIndex += 1;
    await searchEngine(task, search, image, imageKey, tabActive);

    if (firstEngine && task.searchMode === 'upload') {
      await browser.tabs.remove(task.sourceTabId);
      task.sourceTabIndex -= 1;
    }

    tabActive = false;
    firstEngine = false;
  }

  if ((await isAndroid()) && contributePageTabId) {
    await browser.tabs.update(contributePageTabId, {active: true});
  }
}

async function searchEngine(task, search, image, imageKey, tabActive) {
  let sessionKey;
  if (search.isSessionKey) {
    sessionKey = addStorageItem(
      {task, search, imageKey},
      {
        receipts: {expected: 1, received: 0},
        expiryTime: 600000 // 10 minutes
      }
    );
  }

  const tabUrl = await getTabUrl(task, search, image, sessionKey);

  let tabId;
  const engine = search.engine;

  if (search.isExec) {
    let registeredScript;

    if (targetEnv === 'samsung') {
      // Samsung Internet 13: tabs.onUpdated does not fire on `complete` status,
      // while webNavigation.onCompleted will provide an incorrect tab ID.
      // Both APIs are used to associate the correct tab ID
      // with the onCompleted event.
      let internalTabId;

      const navCompleteCallback = function (details) {
        if (details.tabId === internalTabId) {
          execEngine(tabId, engine, sessionKey);
        }
      };
      const removeNavCallbacks = function () {
        window.clearTimeout(navTimeoutId);
        browser.webNavigation.onCompleted.removeListener(navCompleteCallback);
      };
      const navTimeoutId = window.setTimeout(removeNavCallbacks, 360000); // 6 minutes

      browser.webNavigation.onCompleted.addListener(navCompleteCallback);

      registeredScript = {unregister: removeNavCallbacks};

      const tabUpdateCallback = function (eventTabId, changes, tab) {
        if (tab.id === tabId) {
          internalTabId = eventTabId;
          removeTabCallbacks();
        }
      };
      const removeTabCallbacks = function () {
        window.clearTimeout(tabTimeoutId);
        browser.tabs.onUpdated.removeListener(tabUpdateCallback);
      };
      const tabTimeoutId = window.setTimeout(removeTabCallbacks, 360000); // 6 minutes

      browser.tabs.onUpdated.addListener(tabUpdateCallback);
    } else {
      const tabUpdateCallback = function (eventTabId, changes, tab) {
        if (tab.id === tabId && changes.status === 'complete') {
          execEngine(tabId, engine, sessionKey);
        }
      };
      const removeCallbacks = function () {
        window.clearTimeout(timeoutId);
        browser.tabs.onUpdated.removeListener(tabUpdateCallback);
      };
      const timeoutId = window.setTimeout(removeCallbacks, 360000); // 6 minutes

      browser.tabs.onUpdated.addListener(tabUpdateCallback);

      registeredScript = {unregister: removeCallbacks};
    }

    sessionKey = addStorageItem(
      {task, search, scripts: [registeredScript], imageKey},
      {
        deleteFn: function (data) {
          for (const script of data.scripts) {
            script.unregister();
          }
          delete data.scripts;
        },
        receipts: {expected: 1, received: 0},
        expiryTime: 600000 // 10 minutes
      }
    );
  }

  const tab = await createTab(tabUrl, {
    index: task.sourceTabIndex,
    active: tabActive
  });
  tabId = tab.id;

  // Samsung Internet 13: webRequest.onBeforeSendHeaders filtering by tab ID
  // returns requests from different tab.
  if ((await isAndroid()) && targetEnv !== 'samsung') {
    // Google only works with a Chrome user agent on Firefox for Android,
    // while other search engines may need a desktop user agent.
    let userAgent;
    if (engine === 'google' && targetEnv === 'firefox') {
      userAgent = chromeMobileUA;
    } else if (['mailru'].includes(engine)) {
      userAgent = chromeDesktopUA;
    }

    if (userAgent) {
      const engineRequestCallback = function (details) {
        for (const header of details.requestHeaders) {
          if (header.name.toLowerCase() === 'user-agent') {
            header.value = userAgent;
            break;
          }
        }
        return {requestHeaders: details.requestHeaders};
      };

      browser.webRequest.onBeforeSendHeaders.addListener(
        engineRequestCallback,
        {
          urls: ['http://*/*', 'https://*/*'],
          tabId
        },
        ['blocking', 'requestHeaders']
      );
    }
  }
}

async function execEngine(tabId, engine, sessionKey) {
  if (['bing'].includes(engine)) {
    await browser.tabs.insertCSS(tabId, {
      runAt: 'document_start',
      file: `/src/engines/css/${engine}.css`
    });
  }

  await executeCode(`var sessionKey = '${sessionKey}';`, tabId);
  await executeFile(`/src/commons-engine/script.js`, tabId);
  await executeFile(`/src/engines/${engine}/script.js`, tabId);
}

async function searchClickTarget(task) {
  const [isParseModule] = await executeCode(
    `typeof initParse !== 'undefined'`,
    task.sourceTabId
  );
  if (!isParseModule) {
    await executeFile(
      '/src/parse/script.js',
      task.sourceTabId,
      task.sourceFrameId
    );
  }

  await browser.tabs.sendMessage(
    task.sourceTabId,
    {
      id: 'parsePage',
      task
    },
    {frameId: task.sourceFrameId}
  );
}

async function handleParseResults(task, images) {
  if (!images.length) {
    await showNotification({messageId: 'error_imageNotFound'});
  } else if (images.length > 1) {
    await openContentView({task, images}, 'confirm');
  } else {
    await initSearch(task, images);
  }
}

async function onContextMenuItemClick(info, tab) {
  if (targetEnv === 'samsung' && tab.id !== browser.tabs.TAB_ID_NONE) {
    // Samsung Internet 13: contextMenus.onClicked provides wrong tab index.
    tab = await browser.tabs.get(tab.id);
  }

  const task = await createTask({
    taskOrigin: 'context',
    sourceTabId: tab.id,
    sourceTabIndex: tab.index,
    sourceFrameId: typeof info.frameId !== 'undefined' ? info.frameId : 0,
    engine: info.menuItemId
  });

  if (task.searchMode === 'capture') {
    await openContentView({task}, 'capture');
  } else {
    if (!(await scriptsAllowed(task.sourceTabId, task.sourceFrameId))) {
      if (
        info.srcUrl &&
        info.mediaType === 'image' &&
        validateUrl(info.srcUrl)
      ) {
        await initSearch(task, {imageUrl: info.srcUrl});
      } else {
        await showNotification({messageId: 'error_scriptsNotAllowed'});
      }
      return;
    }

    await searchClickTarget(task);
  }
}

async function createTask(data) {
  const task = {
    taskOrigin: '',
    taskType: 'search',
    searchMode: '',
    sourceTabId: -1,
    sourceTabIndex: -1,
    sourceFrameId: -1,
    engineGroup: '',
    engines: [],
    options: {}
  };

  task.options = await storage.get(optionKeys, 'sync');

  if (data.options) {
    Object.assign(task.options, data.options);

    delete data.options;
  }

  if (data.engine) {
    if (data.engine === 'allEngines') {
      const enabledEngines = await getEnabledEngines(task.options);
      task.engineGroup = 'allEngines';
      task.engines = enabledEngines;
    } else {
      task.engines.push(data.engine);
    }

    delete data.engine;
  }

  Object.assign(task, data);

  if (!task.searchMode) {
    task.searchMode =
      task.taskOrigin === 'action'
        ? task.options.searchModeAction
        : task.options.searchModeContextMenu;
  }

  return task;
}

async function openContentView(message, view) {
  const tabId = message.task.sourceTabId;

  if (!(await scriptsAllowed(tabId))) {
    await showNotification({messageId: 'error_scriptsNotAllowed'});
    return;
  }

  const [isContentModule] = await executeCode(
    `typeof initContent !== 'undefined'`,
    tabId
  );
  if (!isContentModule) {
    await executeFile('/src/content/script.js', tabId);
  }

  await browser.tabs.sendMessage(
    tabId,
    {
      id: 'openView',
      ...message,
      view
    },
    {frameId: 0}
  );
}

async function onActionClick(task, tabUrl) {
  if (task.searchMode === 'upload') {
    const browseUrl = browser.extension.getURL('/src/browse/index.html');
    const sessionKey = addStorageItem(task, {
      receipts: {expected: 1, received: 0},
      expiryTime: 60000 // 1 minute
    });
    await createTab(`${browseUrl}?session=${sessionKey}`, {
      index: task.sourceTabIndex + 1,
      openerTabId: task.sourceTabId
    });
  } else if (task.searchMode === 'capture') {
    await openContentView({task}, 'capture');
  } else if (['select', 'selectUpload'].includes(task.searchMode)) {
    if (tabUrl.startsWith('file://') && targetEnv !== 'firefox') {
      await showNotification({messageId: 'error_invalidImageUrl_fileUrl'});
      return;
    }

    await openContentView({task}, 'select');

    if (await scriptsAllowed(task.sourceTabId)) {
      await showContentSelectionPointer(task.sourceTabId);
    }
  }
}

async function onActionButtonClick(tab) {
  if (targetEnv === 'samsung' && tab.id !== browser.tabs.TAB_ID_NONE) {
    // Samsung Internet 13: browserAction.onClicked provides wrong tab index.
    tab = await browser.tabs.get(tab.id);
  }

  const task = await createTask({
    taskOrigin: 'action',
    sourceTabId: tab.id,
    sourceTabIndex: tab.index
  });

  if (task.searchMode === 'url') {
    await showNotification({
      messageId: (await isAndroid())
        ? 'error_invalidSearchModeMobile_url'
        : 'error_invalidSearchMode_url'
    });
    return;
  }

  const enabledEngines = await getEnabledEngines(task.options);

  if (enabledEngines.length === 0) {
    await showNotification({messageId: 'error_allEnginesDisabled'});
    return;
  }

  if (
    task.options.searchAllEnginesAction === 'main' &&
    enabledEngines.length > 1
  ) {
    task.engineGroup = 'allEngines';
    task.engines = enabledEngines;
  } else {
    task.engines.push(enabledEngines[0]);
  }

  onActionClick(task, tab.url);
}

async function onActionPopupClick(engine, imageUrl) {
  const {searchModeAction} = await storage.get('searchModeAction', 'sync');

  const tab = await getActiveTab();

  const task = await createTask({
    taskOrigin: 'action',
    searchMode: searchModeAction,
    sourceTabId: tab.id,
    sourceTabIndex: tab.index,
    engine
  });

  if (searchModeAction === 'url') {
    await initSearch(task, {imageUrl});
  } else {
    onActionClick(task, tab.url);
  }
}

function setRequestReferrer(url, referrer, token) {
  const requestCallback = function (details) {
    const headers = details.requestHeaders;
    for (const header of headers) {
      if (
        header.name.toLowerCase() === 'x-sbi-token' &&
        header.value === token
      ) {
        headers.splice(headers.indexOf(header), 1);
        headers.push({
          name: 'Referer',
          value: referrer
        });
        removeCallbacks();
        return {requestHeaders: headers};
      }
    }
  };

  const removeCallbacks = function () {
    window.clearTimeout(timeoutId);
    browser.webRequest.onBeforeSendHeaders.removeListener(requestCallback);
  };
  const timeoutId = window.setTimeout(removeCallbacks, 10000); // 10 seconds

  browser.webRequest.onBeforeSendHeaders.addListener(
    requestCallback,
    {
      urls: [url],
      types: ['xmlhttprequest']
    },
    ['blocking', 'requestHeaders']
  );
}

async function showContentSelectionPointer(tabId) {
  return browser.tabs.executeScript(tabId, {
    allFrames: true,
    runAt: 'document_start',
    code: `
      if (typeof addTouchListener !== 'undefined') {
        addTouchListener();
        showPointer();
      }
    `
  });
}

async function hideContentSelectionPointer(tabId) {
  return browser.tabs.executeScript(tabId, {
    allFrames: true,
    runAt: 'document_start',
    code: `
      if (typeof removeTouchListener !== 'undefined') {
        removeTouchListener();
        hidePointer();
      }
    `
  });
}

async function initSearch(task, images) {
  if (!Array.isArray(images)) {
    images = [images];
  }

  const tab = await browser.tabs.get(task.sourceTabId);
  task.sourceTabIndex = tab.index;

  let firstBatchItem = true;
  for (const image of images) {
    await searchImage(task, image, firstBatchItem);
    firstBatchItem = false;
  }
}

function onMessage(request, sender) {
  return processMessage(request, sender);
}

async function processMessage(request, sender) {
  // Samsung Internet 13: extension messages are sometimes also dispatched
  // to the sender frame.
  if (sender.url === document.URL) {
    return;
  }

  if (
    targetEnv === 'samsung' &&
    sender.tab &&
    sender.tab.id !== browser.tabs.TAB_ID_NONE
  ) {
    // Samsung Internet 13: runtime.onMessage provides wrong tab index.
    sender.tab = await browser.tabs.get(sender.tab.id);
  }

  if (request.id === 'cancelView') {
    if (request.view === 'select') {
      hideContentSelectionPointer(sender.tab.id);
    }
    browser.tabs.sendMessage(
      sender.tab.id,
      {id: 'closeView', view: request.view},
      {frameId: 0}
    );
  } else if (request.id === 'discardView') {
    if (request.view === 'select') {
      hideContentSelectionPointer(sender.tab.id);
    }
  } else if (request.id === 'actionPopupSubmit') {
    onActionPopupClick(request.engine, request.imageUrl);
  } else if (request.id === 'imageUploadSubmit') {
    request.task.sourceTabId = sender.tab.id;
    initSearch(request.task, request.images);
  } else if (request.id === 'imageSelectionSubmit') {
    hideContentSelectionPointer(sender.tab.id);
    browser.tabs.sendMessage(
      sender.tab.id,
      {id: 'closeView', view: 'select', messageView: true},
      {frameId: 0}
    );

    searchClickTarget(request.task);
  } else if (request.id === 'imageConfirmationSubmit') {
    browser.tabs.sendMessage(
      sender.tab.id,
      {id: 'closeView', view: 'confirm'},
      {frameId: 0}
    );
    initSearch(request.task, request.image);
  } else if (request.id === 'imageCaptureSubmit') {
    const tabId = sender.tab.id;
    browser.tabs.sendMessage(
      tabId,
      {id: 'closeView', view: 'capture'},
      {frameId: 0}
    );

    const [[surfaceWidth, surfaceHeight]] = await executeCode(
      `[window.innerWidth, window.innerHeight];`,
      tabId
    );
    const area = {...request.area, surfaceWidth, surfaceHeight};

    const captureData = await captureVisibleTabArea(area);
    const image = {
      imageDataUrl: captureData,
      imageFilename: normalizeFilename({ext: 'png'}),
      imageType: 'image/png',
      imageExt: 'png'
    };

    initSearch(request.task, image);
  } else if (request.id === 'pageParseSubmit') {
    handleParseResults(request.task, request.images);
  } else if (request.id === 'pageParseError') {
    showNotification({messageId: 'error_internalError'});
  } else if (request.id === 'setRequestReferrer') {
    setRequestReferrer(request.url, request.referrer, request.token);
  } else if (request.id === 'notification') {
    showNotification({
      message: request.message,
      messageId: request.messageId,
      title: request.title,
      type: request.type
    });
  } else if (request.id === 'routeMessage') {
    const params = [
      request.messageTabId ? request.messageTabId : sender.tab.id
    ];

    const routedMessage = request.message;
    if (request.setSenderTabId) {
      routedMessage.senderTabId = sender.tab.id;
    }
    if (request.setSenderFrameId) {
      routedMessage.senderFrameId = sender.frameId;
    }
    params.push(routedMessage);

    if (request.hasOwnProperty('messageFrameId')) {
      params.push({frameId: request.messageFrameId});
    }

    browser.tabs.sendMessage(...params);
  } else if (request.id === 'getPlatform') {
    return getPlatform();
  } else if (request.id === 'storageRequest') {
    const data = getStorageItem(request.storageKey);
    if (data) {
      if (request.asyncResponse) {
        return Promise.resolve(data);
      } else {
        browser.tabs.sendMessage(
          sender.tab.id,
          {id: 'storageResponse', storageItem: data},
          {frameId: sender.frameId}
        );
      }
    }
  }
}

async function onStorageChange(changes, area) {
  await setContextMenu({removeFirst: true});
  await setBrowserAction();
}

async function setContextMenu({removeFirst = false} = {}) {
  if (targetEnv !== 'samsung' && (await isAndroid())) {
    return;
  }

  if (removeFirst) {
    await browser.contextMenus.removeAll();
  }
  const options = await storage.get(optionKeys, 'sync');
  const hasListener = browser.contextMenus.onClicked.hasListener(
    onContextMenuItemClick
  );
  if (options.showInContextMenu === true) {
    if (!hasListener) {
      browser.contextMenus.onClicked.addListener(onContextMenuItemClick);
    }
    await createMenu(options);
  } else {
    if (hasListener) {
      browser.contextMenus.onClicked.removeListener(onContextMenuItemClick);
    }
  }
}

async function setBrowserAction() {
  const options = await storage.get(
    ['engines', 'disabledEngines', 'searchAllEnginesAction'],
    'sync'
  );
  const enEngines = await getEnabledEngines(options);
  const hasListener = browser.browserAction.onClicked.hasListener(
    onActionButtonClick
  );

  if (enEngines.length === 1) {
    if (!hasListener) {
      browser.browserAction.onClicked.addListener(onActionButtonClick);
    }
    browser.browserAction.setTitle({
      title: getText(
        'actionTitle_engine',
        getText(`menuItemTitle_${enEngines[0]}`)
      )
    });
    browser.browserAction.setPopup({popup: ''});
    return;
  }

  if (options.searchAllEnginesAction === 'main' && enEngines.length > 1) {
    if (!hasListener) {
      browser.browserAction.onClicked.addListener(onActionButtonClick);
    }
    browser.browserAction.setTitle({
      title: getText('actionTitle_allEngines')
    });
    browser.browserAction.setPopup({popup: ''});
    return;
  }

  browser.browserAction.setTitle({title: getText('extensionName')});
  if (enEngines.length === 0) {
    if (!hasListener) {
      browser.browserAction.onClicked.addListener(onActionButtonClick);
    }
    browser.browserAction.setPopup({popup: ''});
  } else {
    if (hasListener) {
      browser.browserAction.onClicked.removeListener(onActionButtonClick);
    }
    browser.browserAction.setPopup({popup: '/src/action/index.html'});
  }
}

function addStorageListener() {
  browser.storage.onChanged.addListener(onStorageChange);
}

function addMessageListener() {
  browser.runtime.onMessage.addListener(onMessage);
}

async function onInstall(details) {
  if (
    ['chrome', 'edge', 'opera', 'samsung'].includes(targetEnv) &&
    ['install', 'update'].includes(details.reason)
  ) {
    const tabs = await browser.tabs.query({
      url: ['http://*/*', 'https://*/*'],
      windowType: 'normal'
    });

    for (const tab of tabs) {
      browser.tabs.executeScript(tab.id, {
        allFrames: true,
        runAt: 'document_start',
        file: '/src/content/insert.js'
      });
    }
  }
}

async function onLoad() {
  await initStorage('sync');
  await setContextMenu();
  await setBrowserAction();
  addStorageListener();
  addMessageListener();
}

browser.runtime.onInstalled.addListener(onInstall);

document.addEventListener('DOMContentLoaded', onLoad);
