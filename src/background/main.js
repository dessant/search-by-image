import browser from 'webextension-polyfill';
import {cloneDeep} from 'lodash-es';
import uuidV4 from 'uuid/v4';

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
  getActiveTab
} from 'utils/common';
import {
  getEnabledEngines,
  getSupportedEngines,
  getSearches,
  showNotification,
  showContributePage,
  normalizeFilename,
  captureVisibleTabArea
} from 'utils/app';
import {optionKeys, engines, chromeUA} from 'utils/data';
import {targetEnv} from 'utils/config';

const dataStore = {};

function storeData(data) {
  data = cloneDeep(data);
  const dataKey = uuidV4();
  data.dataKey = dataKey;
  dataStore[dataKey] = data;
  return dataKey;
}

function deleteData(dataKey) {
  const data = dataStore[dataKey];
  if (data) {
    delete dataStore[dataKey];
    return data;
  }
}

function getEngineMenuIcons(engine) {
  if (['iqdb', 'karmaDecay', 'tineye', 'whatanime'].includes(engine)) {
    return {
      '16': `src/icons/engines/${engine}-16.png`,
      '32': `src/icons/engines/${engine}-32.png`
    };
  } else {
    if (['branddb', 'madridMonitor'].includes(engine)) {
      engine = 'wipo';
    }
    return {
      '16': `src/icons/engines/${engine}.svg`
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
    'page',
    'selection',
    'video'
  ];
  const urlPatterns = ['http://*/*', 'https://*/*', 'ftp://*/*'];
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

    enEngines.forEach(function(engine) {
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

async function getTabUrl(imgData, search, options) {
  const engine = search.engine;
  let tabUrl = engines[engine][search.method].target;

  if (search.isDataKey) {
    tabUrl = tabUrl
      .replace('{engine}', engine)
      .replace('{dataKey}', imgData.dataKey);
  }

  if (!search.isExec && !search.isDataKey) {
    let imgUrl = imgData.url;
    if (engine !== 'ascii2d') {
      imgUrl = encodeURIComponent(imgUrl);
    }
    tabUrl = tabUrl.replace('{imgUrl}', imgUrl);
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
    let {searchCount} = await storage.get('searchCount', 'sync');
    searchCount += 1;
    await storage.set({searchCount}, 'sync');
    if ([10, 100].includes(searchCount)) {
      await showContributePage('search');
      tabIndex += 1;
      tabActive = false;
    }
  }

  const options = await storage.get(optionKeys, 'sync');
  tabActive = !options.tabInBackgound && tabActive;
  const imgData = {};

  if (img.data) {
    imgData.mustUpload = img.mustUpload;
    imgData.filename = img.filename;

    const blob = dataUrlToBlob(img.data);
    imgData.objectUrl = URL.createObjectURL(blob);
    imgData.size = blob.size;
  }

  if (img.url) {
    imgData.url = img.url;
  }

  const targetEngines =
    engine === 'allEngines' ? await getEnabledEngines(options) : [engine];
  const supportedEngines = await getSupportedEngines(imgData, targetEngines);
  const unsupportedEngines = targetEngines.filter(
    item => !supportedEngines.includes(item)
  );
  if (unsupportedEngines.length) {
    await showNotification({
      messageId: 'error_invalidSearchMethod',
      type: 'unsupportedError'
    });
  }

  const searches = await getSearches(imgData, supportedEngines);

  const receiptSearches = searches.filter(item => item.sendsReceipt);
  if (receiptSearches.length) {
    imgData.dataKey = storeData(
      Object.assign({}, imgData, {
        isUpload: Object.assign(
          ...receiptSearches.map(function(item) {
            return {
              [item.engine]: item.method === 'upload'
            };
          })
        ),
        receipts: {
          expected: receiptSearches.length,
          received: 0
        }
      })
    );
    window.setTimeout(function() {
      const data = deleteData(imgData.dataKey);
      if (data && data.objectUrl) {
        URL.revokeObjectURL(data.objectUrl);
      }
    }, 600000); // 10 minutes
  }

  let firstEngine = firstBatchItem;
  for (const search of searches) {
    tabIndex += 1;
    await searchEngine(imgData, search, options, tabIndex, tabActive);

    if (firstEngine && img.origin && img.origin.context === 'browse') {
      await browser.tabs.remove(img.origin.tabId);
      tabIndex -= 1;
    }

    tabActive = false;
    firstEngine = false;
  }

  return tabIndex;
}

async function searchEngine(imgData, search, options, tabIndex, tabActive) {
  const tabUrl = await getTabUrl(imgData, search, options);

  let tabId;
  const engine = search.engine;

  // Some search engines may reload themselves right after the page has finished
  // loading, breaking the injected scripts. Scripts are injected again
  // after reload to mitigate this issue.
  const loadedUrls = {};
  const reloadEngines = ['esearch', 'tmview'];

  if (search.isExec) {
    const tabUpdateCallback = async function(eventTabId, changes, tab) {
      if (eventTabId === tabId && tab.status === 'complete') {
        if (reloadEngines.includes(engine)) {
          const loadedUrl = loadedUrls[engine];
          if (loadedUrl) {
            removeCallbacks();

            if (loadedUrl !== tab.url) {
              return;
            }
          } else {
            loadedUrls[engine] = tab.url;
          }
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
    const timeoutId = window.setTimeout(removeCallbacks, 360000); // 6 minutes

    browser.tabs.onUpdated.addListener(tabUpdateCallback);

    // Taobao needs Chinese locale for image search.
    if (engine === 'taobao') {
      const rxCookie = /((?:^|\s|;)hng=)[^;]*/g;
      const cookieValue = 'CN%7Czh-CN%7CCNY%7C156';

      const taobaoRequestCallback = function(details) {
        if (details.tabId === tabId) {
          taobaoRemoveRequestCallbacks();

          let cookieMatch;
          for (const header of details.requestHeaders) {
            if (header.name.toLowerCase() === 'cookie') {
              header.value = header.value.replace(rxCookie, (match, p1) => {
                cookieMatch = true;
                return p1 + cookieValue;
              });
              break;
            }
          }

          if (!cookieMatch) {
            details.requestHeaders.push({
              name: 'Cookie',
              value: `hng=${cookieValue}`
            });
          }

          const requestId = details.requestId;

          const taobaoResponseCallback = function(details) {
            if (details.requestId === requestId) {
              taobaoRemoveResponseCallbacks();

              let cookieMatch;
              for (const header of details.responseHeaders) {
                if (header.name.toLowerCase() === 'set-cookie') {
                  header.value = header.value.replace(rxCookie, (match, p1) => {
                    cookieMatch = true;
                    return p1 + cookieValue;
                  });
                }
              }

              if (!cookieMatch) {
                const expiry = new Date();
                expiry.setFullYear(expiry.getFullYear() + 1);
                details.responseHeaders.push({
                  name: 'Set-Cookie',
                  value: `hng=${cookieValue}; Domain=.taobao.com; Expires=${expiry.toUTCString()}; Path=/`
                });
              }

              return {responseHeaders: details.responseHeaders};
            }
          };

          const taobaoRemoveResponseCallbacks = function() {
            window.clearTimeout(taobaoResponseTimeoutId);
            browser.webRequest.onHeadersReceived.removeListener(
              taobaoResponseCallback
            );
          };
          const taobaoResponseTimeoutId = window.setTimeout(
            taobaoRemoveResponseCallbacks,
            120000
          ); // 2 minutes

          const extraInfo = ['blocking', 'responseHeaders'];
          if (targetEnv !== 'firefox') {
            extraInfo.push('extraHeaders');
          }

          browser.webRequest.onHeadersReceived.addListener(
            taobaoResponseCallback,
            {types: ['main_frame'], urls: ['https://www.taobao.com/*'], tabId},
            extraInfo
          );

          return {requestHeaders: details.requestHeaders};
        }
      };

      const taobaoRemoveRequestCallbacks = function() {
        window.clearTimeout(taobaoRequestTimeoutId);
        browser.webRequest.onBeforeSendHeaders.removeListener(
          taobaoRequestCallback
        );
      };
      const taobaoRequestTimeoutId = window.setTimeout(
        taobaoRemoveRequestCallbacks,
        60000
      ); // 1 minute

      const extraInfo = ['blocking', 'requestHeaders'];
      if (targetEnv !== 'firefox') {
        extraInfo.push('extraHeaders');
      }

      browser.webRequest.onBeforeSendHeaders.addListener(
        taobaoRequestCallback,
        {types: ['main_frame'], urls: ['https://www.taobao.com/']},
        extraInfo
      );
    }
  }

  const tab = await createTab(tabUrl, {index: tabIndex, active: tabActive});
  tabId = tab.id;

  // Google only works with a Blink/WebKit user agent on Android.
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
  await executeCode(`var dataKey = '${dataKey}';`, tabId);
  await executeFile(`/src/content/common.js`, tabId);
  await executeFile(`/src/content/engines/${engine}.js`, tabId);
}

async function searchClickTarget(tabId, frameId, engine, eventOrigin) {
  await executeCode(
    `
    frameStore.data.engine = '${engine}';
    frameStore.data.eventOrigin = '${eventOrigin}';
  `,
    tabId,
    frameId
  );

  const [probe] = await executeCode('frameStore;', tabId, frameId);
  if (!probe.modules.manifest) {
    await rememberExecution('manifest', tabId, frameId);
    await executeFile('/src/manifest.js', tabId, frameId);
  }
  if (!probe.modules.parse) {
    await rememberExecution('parse', tabId, frameId);
    await executeFile('/src/parse/script.js', tabId, frameId);
  }

  await executeCode('initParse();', tabId, frameId);
}

async function handleParseResults(images, engine, tabId, tabIndex) {
  if (images.length === 0) {
    await showNotification({messageId: 'error_imageNotFound'});
    return;
  }

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

  const {searchModeContextMenu} = await storage.get(
    'searchModeContextMenu',
    'sync'
  );

  if (searchModeContextMenu === 'capture') {
    await showCapture(tabId, engine);
    return;
  }

  if (!(await scriptsAllowed(tabId, frameId))) {
    if (info.srcUrl && info.mediaType === 'image') {
      await searchImage({data: info.srcUrl}, engine, tabIndex);
    } else {
      await showNotification({messageId: 'error_scriptsNotAllowed'});
    }
    return;
  }

  await searchClickTarget(tabId, frameId, engine, 'contextMenu');
}

function rememberExecution(module, tabId, frameId = 0) {
  return executeCode(`frameStore.modules.${module} = true;`, tabId, frameId);
}

async function onActionClick(tabIndex, tabId, tabUrl, engine, searchMode) {
  if (searchMode === 'upload') {
    const browseUrl = browser.extension.getURL('/src/browse/index.html');
    await createTab(`${browseUrl}?engine=${engine}`, {
      index: tabIndex + 1,
      openerTabId: tabId
    });
    return;
  }

  if (searchMode === 'capture') {
    await showCapture(tabId, engine);
    return;
  }

  if (['select', 'selectUpload'].includes(searchMode)) {
    if (tabUrl.startsWith('file://') && targetEnv !== 'firefox') {
      await showNotification({messageId: 'error_invalidImageUrl_fileUrl'});
      return;
    }

    if (!(await scriptsAllowed(tabId))) {
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
    await searchImage({url: imageUrl}, engine, tabIndex);
    return;
  }

  onActionClick(tabIndex, tab.id, tab.url, engine, searchModeAction);
}

async function showCapture(tabId, engine) {
  if (!(await scriptsAllowed(tabId))) {
    await showNotification({messageId: 'error_scriptsNotAllowed'});
    return;
  }

  const [probe] = await executeCode('frameStore;', tabId);
  if (!probe.modules.capture) {
    await rememberExecution('capture', tabId);

    await browser.tabs.insertCSS(tabId, {
      runAt: 'document_start',
      file: '/src/capture/frame.css'
    });

    await executeFile('/src/content/capture.js', tabId);
  }

  await browser.tabs.sendMessage(
    tabId,
    {
      id: 'imageCaptureOpen',
      engine
    },
    {frameId: 0}
  );
}

function setRequestReferrer(url, referrer, token) {
  const requestCallback = function(details) {
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

  const removeCallbacks = function() {
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

async function onMessage(request, sender, sendResponse) {
  if (request.id === 'imageDataRequest') {
    const imgData = dataStore[request.dataKey];
    const response = {id: 'imageDataResponse'};
    if (imgData) {
      response.imgData = imgData;
    } else {
      response.error = 'sessionExpired';
    }
    browser.tabs.sendMessage(sender.tab.id, response, {frameId: 0});
    return;
  }

  if (request.id === 'actionPopupSubmit') {
    onActionPopupClick(request.engine, request.imageUrl);
    return;
  }

  if (request.id === 'imageUploadSubmit') {
    let tabIndex = sender.tab.index;
    let tabActive = true;
    let firstBatchItem = true;
    for (let img of request.images) {
      img.origin = {context: 'browse', tabId: sender.tab.id};
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

  if (request.id === 'dataReceipt') {
    const data = dataStore[request.dataKey];
    if (data) {
      data.receipts.received += 1;
      if (data.receipts.received === data.receipts.expected) {
        deleteData(data.dataKey);
        if (data.objectUrl) {
          URL.revokeObjectURL(data.objectUrl);
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
    searchClickTarget(sender.tab.id, sender.frameId, request.engine, 'action');
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

  if (request.id === 'imageCaptureSubmit') {
    const tabId = sender.tab.id;
    browser.tabs.sendMessage(tabId, {id: 'imageCaptureClose'}, {frameId: 0});

    const [[surfaceWidth, surfaceHeight]] = await executeCode(
      `[window.innerWidth, window.innerHeight];`,
      tabId
    );
    const area = {...request.area, surfaceWidth, surfaceHeight};

    const captureData = await captureVisibleTabArea(area);
    const image = {
      data: captureData,
      filename: normalizeFilename({ext: 'png'})
    };

    searchImage(image, request.engine, sender.tab.index);
    return;
  }

  if (request.id === 'imageCaptureCancel') {
    browser.tabs.sendMessage(
      sender.tab.id,
      {id: 'imageCaptureClose'},
      {frameId: 0}
    );
    return;
  }

  if (request.id === 'pageParseSubmit') {
    handleParseResults(
      request.images,
      request.engine,
      sender.tab.id,
      sender.tab.index
    );
    return;
  }

  if (request.id === 'pageParseError') {
    showNotification({messageId: 'error_internalError'});
    return;
  }

  if (request.id === 'setRequestReferrer') {
    setRequestReferrer(request.url, request.referrer, request.token);
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

async function onInstall(details) {
  if (
    ['chrome', 'edge', 'opera'].includes(targetEnv) &&
    ['install', 'update'].includes(details.reason)
  ) {
    const tabs = await browser.tabs.query({
      url: ['http://*/*', 'https://*/*', 'ftp://*/*'],
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
