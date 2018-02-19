import browser from 'webextension-polyfill';
import _ from 'lodash';
import uuidV4 from 'uuid/v4';

import storage from 'storage/storage';
import {
  getText,
  createTab,
  executeCode,
  executeFile,
  scriptsAllowed,
  onComplete,
  getRandomString,
  getRandomInt,
  dataUriToBlob,
  getDataUriMimeType,
  isAndroid,
  getActiveTab
} from 'utils/common';
import {
  getEnabledEngines,
  showNotification,
  getRandomFilename,
  showContributePage
} from 'utils/app';
import {optionKeys, engines, imageMimeTypes, chromeUA} from 'utils/data';
import {targetEnv} from 'utils/config';

const dataStore = {};

function storeData(data) {
  data = _.cloneDeep(data);
  const dataKey = uuidV4();
  dataStore[dataKey] = data;
  return dataKey;
}

function deleteData(dataKey) {
  if (dataStore.hasOwnProperty(dataKey)) {
    delete dataStore[dataKey];
    return true;
  }
}

function createMenuItem({
  id,
  title = '',
  contexts,
  parent,
  type = 'normal',
  urlPatterns
}) {
  browser.contextMenus.create(
    {
      id,
      title,
      contexts,
      documentUrlPatterns: urlPatterns,
      parentId: parent,
      type
    },
    onComplete
  );
}

async function createMenu(options) {
  const enEngines = await getEnabledEngines(options);
  const contexts = [
    'audio',
    'editable',
    'frame',
    'image',
    'link',
    'page',
    'selection',
    'video'
  ];
  const urlPatterns = ['http://*/*', 'https://*/*', 'ftp://*/*'];
  if (targetEnv === 'firefox') {
    urlPatterns.push('file:///*');
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

    createMenuItem({
      id: 'par-1',
      title: getText('mainMenuGroupTitle_searchImage'),
      contexts,
      urlPatterns
    });

    if (searchAllEngines === 'sub') {
      createMenuItem({
        id: 'allEngines',
        title: getText('menuItemTitle_allEngines'),
        contexts,
        parent: 'par-1',
        urlPatterns
      });
      createMenuItem({
        id: 'sep-1',
        contexts,
        parent: 'par-1',
        type: 'separator',
        urlPatterns
      });
    }

    enEngines.forEach(function(engine) {
      createMenuItem({
        id: engine,
        title: getText(`menuItemTitle_${engine}`),
        contexts,
        parent: 'par-1',
        urlPatterns
      });
    });
  }
}

async function getTabUrl(imgData, engine, options) {
  let tabUrl;

  if (imgData.isBlob) {
    tabUrl = engines[engine].upload;
    if (['google', 'tineye', 'karmaDecay'].includes(engine)) {
      tabUrl = tabUrl.replace('{dataKey}', imgData.dataKey);
    }
  } else {
    tabUrl = engines[engine].url.replace(
      '{imgUrl}',
      encodeURIComponent(imgData.url)
    );
    if (engine === 'google' && !options.localGoogle) {
      tabUrl = `${tabUrl}&gws_rd=cr&gl=US`;
    }
  }

  return tabUrl;
}

async function searchImage(
  img,
  engine,
  tabIndex,
  tabActive = true,
  firstBatchItem = true
) {
  if (firstBatchItem) {
    let {searchCount, contribPageLastOpen} = await storage.get(
      ['searchCount', 'contribPageLastOpen'],
      'sync'
    );
    searchCount += 1;
    await storage.set({searchCount}, 'sync');
    if (
      [10, 100].includes(searchCount) &&
      (!contribPageLastOpen ||
        contribPageLastOpen === 1000 ||
        contribPageLastOpen > 1512892800000)
    ) {
      await showContributePage('search');
      tabIndex += 1;
      tabActive = false;
    }
  }

  const options = await storage.get(optionKeys, 'sync');

  tabActive = !options.tabInBackgound && tabActive;
  let engines =
    engine === 'allEngines' ? await getEnabledEngines(options) : [engine];
  let dataKey = '';
  const imgData = {
    isBlob: img.hasOwnProperty('objectUrl') || img.data.startsWith('data:')
  };

  if (imgData.isBlob) {
    if (!img.hasOwnProperty('filename') || !img.filename) {
      const ext = _.get(imageMimeTypes, getDataUriMimeType(img.data), '');
      const filename = getRandomString(getRandomInt(5, 20));
      imgData.filename = ext ? `${filename}.${ext}` : filename;
    } else {
      imgData.filename = img.filename;
    }
    if (img.hasOwnProperty('objectUrl')) {
      imgData.size = img.size;
      imgData.objectUrl = img.objectUrl;
      imgData.receiptKey = img.receiptKey;
    } else {
      const blob = dataUriToBlob(img.data);
      imgData.size = blob.size;
      imgData.objectUrl = URL.createObjectURL(blob);
      imgData.receiptKey = storeData({
        total: engines.length,
        receipts: 0,
        objectUrl: imgData.objectUrl
      });

      window.setTimeout(function() {
        const newDelete = deleteData(imgData.receiptKey);
        if (newDelete) {
          URL.revokeObjectURL(imgData.objectUrl);
        }
      }, 600000); // 10 minutes
    }

    imgData.dataKey = storeData(imgData);
    window.setTimeout(function() {
      deleteData(imgData.dataKey);
    }, 600000); // 10 minutes
  } else {
    imgData.url = img.data;
  }

  for (const engine of engines) {
    tabIndex = tabIndex + 1;
    await searchEngine(imgData, engine, options, tabIndex, tabActive);
    tabActive = false;
  }

  return tabIndex;
}

async function searchEngine(imgData, engine, options, tabIndex, tabActive) {
  const tabUrl = await getTabUrl(imgData, engine, options);

  let tabId;
  let loadedBingUrl;
  let bingRemoveCallbacks;
  const execEngines = ['bing', 'yandex', 'baidu', 'sogou'];
  if (imgData.dataKey && execEngines.includes(engine)) {
    const tabUpdateCallback = async function(eventTabId, changes, tab) {
      if (eventTabId === tabId && tab.status === 'complete') {
        if (engine === 'bing') {
          if (loadedBingUrl) {
            if (loadedBingUrl !== tab.url) {
              removeCallbacks();
              bingRemoveCallbacks();
            }
            return;
          }
          loadedBingUrl = tab.url;
        } else {
          removeCallbacks();
        }

        execEngine(tabId, engine, imgData.dataKey);
      }
    };
    const removeCallbacks = function() {
      window.clearTimeout(timeoutId);
      browser.tabs.onUpdated.removeListener(tabUpdateCallback);
    };
    const timeoutId = window.setTimeout(removeCallbacks, 120000); // 2 minutes

    browser.tabs.onUpdated.addListener(tabUpdateCallback);

    // Bing may reload itself right after the page has finished loading,
    // breaking the injected scripts. Requests to the current URL
    // are blocked for a short period to prevent this.
    if (engine === 'bing') {
      const bingRequestCallback = function(details) {
        if (details.tabId === tabId && details.url === loadedBingUrl) {
          return {cancel: true};
        }
      };
      bingRemoveCallbacks = function() {
        window.clearTimeout(bingTimeoutId);
        browser.webRequest.onBeforeRequest.removeListener(bingRequestCallback);
      };
      const bingTimeoutId = window.setTimeout(bingRemoveCallbacks, 180000); // 3 minutes

      browser.webRequest.onBeforeRequest.addListener(
        bingRequestCallback,
        {
          types: ['main_frame'],
          urls: ['https://www.bing.com/*']
        },
        ['blocking']
      );
    }
  }

  const tab = await createTab(tabUrl, tabIndex, tabActive);
  tabId = tab.id;

  // Google only works with a WebKit user agent on Android.
  if (targetEnv === 'firefox' && engine === 'google' && (await isAndroid())) {
    const googleRequestCallback = function(details) {
      for (const header of details.requestHeaders) {
        if (header.name.toLowerCase() === 'user-agent') {
          header.value = chromeUA;
          break;
        }
      }
      return {requestHeaders: details.requestHeaders};
    };

    browser.webRequest.onBeforeSendHeaders.addListener(
      googleRequestCallback,
      {
        urls: ['http://*/*', 'https://*/*'],
        tabId
      },
      ['blocking', 'requestHeaders']
    );
  }
}

async function execEngine(tabId, engine, dataKey) {
  if (['bing'].includes(engine)) {
    await browser.tabs.insertCSS(tabId, {
      runAt: 'document_start',
      file: '/src/content/engines/style.css'
    });
  }

  await executeCode(`var dataKey = '${dataKey}';`, tabId);
  await executeFile(`/src/content/common.js`, tabId);
  await executeFile(`/src/content/engines/${engine}.js`, tabId);
}

async function searchClickTarget(engine, tabId, tabIndex, frameId) {
  const {imgFullParse} = await storage.get('imgFullParse', 'sync');
  await executeCode(
    `frameStore.options.imgFullParse = ${imgFullParse};`,
    tabId,
    frameId
  );

  const [probe] = await executeCode('frameStore;', tabId, frameId);
  if (!probe.modules.parse) {
    await rememberExecution('parse', tabId, frameId);
    await executeFile('/src/content/parse.js', tabId, frameId);
  }

  let [images] = await executeCode('parseDocument();', tabId, frameId);

  if (!images) {
    await showNotification({messageId: 'error_InternalError'});
    return;
  }

  if (images.length === 0) {
    await showNotification({messageId: 'error_imageNotFound'});
    return;
  }

  images = _.uniqBy(images, 'data');

  if (images.length > 1) {
    const [probe] = await executeCode('frameStore;', tabId);
    if (!probe.modules.confirm) {
      await rememberExecution('confirm', tabId);

      await browser.tabs.insertCSS(tabId, {
        runAt: 'document_start',
        file: '/src/confirm/frame.css'
      });

      await executeFile('/src/content/confirm.js', tabId);
    }

    await browser.tabs.sendMessage(
      tabId,
      {
        id: 'imageConfirmationOpen',
        images,
        engine
      },
      {frameId: 0}
    );
  } else {
    await searchImage(images[0], engine, tabIndex);
  }
}

async function onContextMenuItemClick(info, tab) {
  const tabId = tab.id;
  const tabIndex = tab.index;
  const frameId = typeof info.frameId !== 'undefined' ? info.frameId : 0;
  const engine = info.menuItemId;

  if (!await scriptsAllowed(tabId, frameId)) {
    if (info.srcUrl) {
      await searchImage({data: info.srcUrl}, engine, tabIndex);
    } else {
      await showNotification({messageId: 'error_scriptsNotAllowed'});
    }
    return;
  }

  // Firefox < 55.0
  if (
    !frameId &&
    typeof info.frameUrl !== 'undefined' &&
    info.pageUrl !== info.frameUrl
  ) {
    if (info.srcUrl) {
      await searchImage({data: info.srcUrl}, engine, tabIndex);
    } else {
      await showNotification({messageId: 'error_imageNotFound'});
    }
    return;
  }

  await searchClickTarget(engine, tabId, tabIndex, frameId);
}

function rememberExecution(module, tabId, frameId = 0) {
  return executeCode(`frameStore.modules.${module} = true;`, tabId, frameId);
}

async function onActionClick(tabIndex, tabId, tabUrl, engine, searchMode) {
  if (searchMode === 'upload') {
    const browseUrl = browser.extension.getURL('/src/browse/index.html');
    await createTab(`${browseUrl}?engine=${engine}`, tabIndex + 1, true, tabId);
    return;
  }

  if (searchMode === 'select') {
    if (tabUrl.startsWith('file:') && targetEnv !== 'firefox') {
      await showNotification({messageId: 'error_invalidImageUrl_fileUrl'});
      return;
    }

    if (!await scriptsAllowed(tabId)) {
      await showNotification({messageId: 'error_scriptsNotAllowed'});
      return;
    }

    const [probe] = await executeCode('frameStore;', tabId);
    if (!probe.modules.select) {
      await rememberExecution('select', tabId);

      await browser.tabs.insertCSS(tabId, {
        runAt: 'document_start',
        file: '/src/select/frame.css'
      });

      await executeFile('/src/content/select.js', tabId);
    }

    await browser.tabs.executeScript(tabId, {
      allFrames: true,
      runAt: 'document_start',
      code: `
        if (typeof addClickListener !== 'undefined') {
          addClickListener();
          showPointer();
          frameStore.data.engine = '${engine}';
        }
      `
    });

    await browser.tabs.sendMessage(
      tabId,
      {
        id: 'imageSelectionOpen'
      },
      {frameId: 0}
    );

    return;
  }
}

async function onActionButtonClick(tab) {
  const options = await storage.get(
    [
      'engines',
      'disabledEngines',
      'searchAllEnginesAction',
      'searchModeAction'
    ],
    'sync'
  );

  if (options.searchModeAction === 'url') {
    await showNotification({messageId: 'error_invalidSearchMode_url'});
    return;
  }

  const enEngines = await getEnabledEngines(options);

  if (enEngines.length === 0) {
    await showNotification({messageId: 'error_allEnginesDisabled'});
    return;
  }

  let engine = null;
  if (options.searchAllEnginesAction === 'main' && enEngines.length > 1) {
    engine = 'allEngines';
  } else {
    engine = enEngines[0];
  }

  onActionClick(tab.index, tab.id, tab.url, engine, options.searchModeAction);
}

async function onActionPopupClick(engine, imageUrl) {
  const {searchModeAction} = await storage.get('searchModeAction', 'sync');

  const tab = await getActiveTab();
  const tabIndex = tab.index;

  if (searchModeAction === 'url') {
    await searchImage({data: imageUrl}, engine, tabIndex);
    return;
  }

  onActionClick(tabIndex, tab.id, tab.url, engine, searchModeAction);
}

async function onMessage(request, sender, sendResponse) {
  if (request.id === 'imageDataRequest') {
    const imgData = dataStore[request.dataKey];
    const response = {id: 'imageDataResponse'};
    if (imgData) {
      response['imgData'] = imgData;
    } else {
      response['error'] = 'sessionExpired';
    }
    browser.tabs.sendMessage(sender.tab.id, response, {frameId: 0});
    return;
  }

  if (request.id === 'actionPopupSubmit') {
    onActionPopupClick(request.engine, request.imageUrl);
    return;
  }

  if (request.id === 'imageUploadSubmit') {
    const tabId = sender.tab.id;
    const receiptKey = storeData({
      total: request.searchCount,
      receipts: 0,
      tabId
    });
    window.setTimeout(function() {
      deleteData(receiptKey);
    }, 600000); // 10 minutes
    let tabIndex = sender.tab.index;
    let tabActive = true;
    let firstBatchItem = true;
    for (let img of request.images) {
      img.receiptKey = receiptKey;
      tabIndex = await searchImage(
        img,
        request.engine,
        tabIndex,
        tabActive,
        firstBatchItem
      );
      tabActive = false;
      firstBatchItem = false;
    }
    return;
  }

  if (request.id === 'imageUploadReceipt') {
    const receiptData = dataStore[request.receiptKey];
    if (receiptData) {
      receiptData.receipts += 1;
      if (receiptData.receipts === receiptData.total) {
        deleteData(request.receiptKey);
        if (receiptData.hasOwnProperty('tabId')) {
          browser.tabs.remove(receiptData.tabId);
        } else {
          URL.revokeObjectURL(receiptData.objectUrl);
        }
      }
    }
    return;
  }

  if (request.id === 'imageSelectionSubmit') {
    browser.tabs.executeScript(sender.tab.id, {
      allFrames: true,
      runAt: 'document_start',
      code: `
        if (typeof removeClickListener !== 'undefined') {
          removeClickListener();
          hidePointer();
        }
      `
    });
    browser.tabs.sendMessage(
      sender.tab.id,
      {id: 'imageSelectionClose', messageFrame: true},
      {frameId: 0}
    );
    searchClickTarget(
      request.engine,
      sender.tab.id,
      sender.tab.index,
      sender.frameId
    );
    return;
  }

  if (request.id === 'imageSelectionCancel') {
    browser.tabs.executeScript(sender.tab.id, {
      allFrames: true,
      runAt: 'document_start',
      code: `
        if (typeof removeClickListener !== 'undefined') {
          removeClickListener();
          hidePointer();
        }
      `
    });
    browser.tabs.sendMessage(
      sender.tab.id,
      {id: 'imageSelectionClose'},
      {frameId: 0}
    );
    return;
  }

  if (request.id === 'imageConfirmationSubmit') {
    browser.tabs.sendMessage(
      sender.tab.id,
      {id: 'imageConfirmationClose'},
      {frameId: 0}
    );
    searchImage(request.img, request.engine, sender.tab.index);
    return;
  }

  if (request.id === 'imageConfirmationCancel') {
    browser.tabs.sendMessage(
      sender.tab.id,
      {id: 'imageConfirmationClose'},
      {frameId: 0}
    );
    return;
  }

  if (request.id.endsWith('FrameId')) {
    browser.tabs.sendMessage(
      sender.tab.id,
      {id: request.id, frameId: sender.frameId},
      {frameId: 0}
    );
    return;
  }

  if (request.id === 'notification') {
    showNotification({
      message: request.message,
      messageId: request.messageId,
      title: request.title,
      type: request.type
    });
    return;
  }

  if (request.id === 'routeMessage') {
    const params = [
      request.hasOwnProperty('tabId') ? request.tabId : sender.tab.id,
      request.data
    ];
    if (request.hasOwnProperty('frameId')) {
      params.push({frameId: request.frameId});
    }
    browser.tabs.sendMessage(...params);
    return;
  }
}

async function onStorageChange(changes, area) {
  await setContextMenu({removeFirst: true});
  await setBrowserAction();
}

async function setContextMenu({removeFirst = false} = {}) {
  if (targetEnv === 'firefox' && (await isAndroid())) {
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

async function onLoad() {
  await storage.init('sync');
  await setContextMenu();
  await setBrowserAction();
  addStorageListener();
  addMessageListener();
}

document.addEventListener('DOMContentLoaded', onLoad);
