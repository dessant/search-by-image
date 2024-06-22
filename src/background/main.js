import {v4 as uuidv4} from 'uuid';
import Queue from 'p-queue';

import {initStorage} from 'storage/init';
import {isStorageReady} from 'storage/storage';
import storage from 'storage/storage';
import {
  getEnabledEngines,
  getSupportedEngines,
  getSearches,
  createSession,
  showNotification,
  captureImage,
  hasModule,
  insertBaseModule,
  fetchImage,
  isContextMenuSupported,
  checkSearchEngineAccess,
  getEngineMenuIcon,
  convertProcessedImage,
  canShare,
  getExtensionUrlPattern,
  getImageUrlFromContextMenuEvent,
  processImageUrl,
  sendLargeMessage,
  processLargeMessage,
  processMessageResponse,
  processAppUse,
  setAppVersion,
  getStartupState,
  getAppTheme,
  showPage,
  getOpenerTabId
} from 'utils/app';
import {
  getText,
  insertCSS,
  executeScript,
  createTab,
  getNewTabUrl,
  isValidTab,
  getActiveTab,
  dataUrlToBlob,
  blobToDataUrl,
  getRandomInt,
  isAndroid,
  isMobile,
  getPlatform,
  stringToInt,
  runOnce
} from 'utils/common';
import {getScriptFunction} from 'utils/scripts';
import {searchGoogle, searchPinterest} from 'utils/engines';
import registry from 'utils/registry';
import {optionKeys, engines, chromeMobileUA, chromeDesktopUA} from 'utils/data';
import {targetEnv, mv3} from 'utils/config';

const queue = new Queue({concurrency: 1});

async function addContentRequestListener({
  url,
  origin = '',
  referrer = '',
  tabId,
  token
} = {}) {
  if (mv3) {
    const ruleId = getRandomInt(1, 5000) + tabId;

    const ruleAction = {type: 'modifyHeaders'};

    const requestHeaders = [];
    if (referrer) {
      requestHeaders.push({
        header: 'Referer',
        operation: 'set',
        value: referrer
      });
    }

    const responseHeaders = [];
    if (origin) {
      responseHeaders.push(
        {
          header: 'Access-Control-Allow-Origin',
          operation: 'set',
          value: origin
        },
        {
          header: 'Access-Control-Allow-Credentials',
          operation: 'set',
          value: 'true'
        }
      );
    }

    if (requestHeaders.length) {
      ruleAction.requestHeaders = requestHeaders;
    }

    if (responseHeaders.length) {
      ruleAction.responseHeaders = responseHeaders;
    }

    await browser.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId],
      addRules: [
        {
          id: ruleId,
          action: ruleAction,
          condition: {
            tabIds: [tabId],
            urlFilter: `${url}*`,
            resourceTypes: ['xmlhttprequest', 'other']
          }
        }
      ]
    });

    browser.alarms.create(`delete-net-request-session-rule_${ruleId}`, {
      delayInMinutes: 2
    });

    return ruleId;
  } else {
    let requestId;
    let origin;

    const requestCallback = function (details) {
      const tokenHeader = details.requestHeaders.find(
        header =>
          header.name.toLowerCase() === 'accept' &&
          header.value === token &&
          details.url === url &&
          details.method === 'GET'
      );
      if (tokenHeader) {
        tokenHeader.value = '*/*';
      }

      if (tokenHeader || details.requestId === requestId) {
        requestId = details.requestId;

        if (referrer) {
          const referrerHeader = details.requestHeaders.find(
            header => header.name.toLowerCase() === 'referer'
          );

          if (referrerHeader) {
            referrerHeader.value = referrer;
          } else {
            details.requestHeaders.push({
              name: 'Referer',
              value: referrer
            });
          }
        }

        const originHeader = details.requestHeaders.find(
          header => header.name.toLowerCase() === 'origin'
        );

        if (originHeader) {
          origin = originHeader.value;
        }

        return {requestHeaders: details.requestHeaders};
      }
    };

    const requestExtraInfo = ['blocking', 'requestHeaders'];
    if (targetEnv !== 'firefox') {
      requestExtraInfo.push('extraHeaders');
    }

    browser.webRequest.onBeforeSendHeaders.addListener(
      requestCallback,
      {
        urls: ['<all_urls>'],
        types: ['xmlhttprequest']
      },
      requestExtraInfo
    );

    const responseCallback = function (details) {
      if (details.requestId === requestId && origin) {
        const allowOriginHeader = details.responseHeaders.find(
          header => header.name.toLowerCase() === 'access-control-allow-origin'
        );

        if (allowOriginHeader) {
          allowOriginHeader.value = origin;
        } else {
          details.responseHeaders.push({
            name: 'Access-Control-Allow-Origin',
            value: origin
          });
        }

        const allowCredentialsHeader = details.responseHeaders.find(
          header =>
            header.name.toLowerCase() === 'access-control-allow-credentials'
        );

        if (allowCredentialsHeader) {
          allowCredentialsHeader.value = 'true';
        } else {
          details.responseHeaders.push({
            name: 'Access-Control-Allow-Credentials',
            value: 'true'
          });
        }

        return {responseHeaders: details.responseHeaders};
      }
    };

    const responseExtraInfo = ['blocking', 'responseHeaders'];
    if (targetEnv !== 'firefox') {
      responseExtraInfo.push('extraHeaders');
    }

    browser.webRequest.onHeadersReceived.addListener(
      responseCallback,
      {
        urls: ['<all_urls>'],
        types: ['xmlhttprequest']
      },
      responseExtraInfo
    );

    const completeCallback = function (details) {
      if (details.requestId === requestId) {
        removeCallbacks();
      }
    };

    const removeCallbacks = function () {
      window.clearTimeout(timeoutId);
      browser.webRequest.onBeforeSendHeaders.removeListener(requestCallback);
      browser.webRequest.onHeadersReceived.removeListener(responseCallback);
      browser.webRequest.onCompleted.removeListener(completeCallback);
      browser.webRequest.onErrorOccurred.removeListener(completeCallback);
    };
    const timeoutId = window.setTimeout(removeCallbacks, 120000); // 2 minutes

    browser.webRequest.onCompleted.addListener(completeCallback, {
      urls: ['<all_urls>'],
      types: ['xmlhttprequest']
    });
    browser.webRequest.onErrorOccurred.addListener(completeCallback, {
      urls: ['<all_urls>'],
      types: ['xmlhttprequest']
    });
  }
}

async function removeContentRequestListener({ruleId} = {}) {
  if (mv3) {
    await browser.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId]
    });

    await browser.alarms.clear(`delete-net-request-session-rule_${ruleId}`);
  }
}

async function setUserAgentHeader({tabId, tabUrl, userAgent} = {}) {
  const ruleId = getRandomInt(1, 5000) + tabId;

  if (targetEnv === 'safari') {
    await browser.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId],
      addRules: [
        {
          id: ruleId,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              {header: 'User-Agent', operation: 'set', value: userAgent}
            ]
          },
          condition: {
            // Safari: tabIds is not supported
            urlFilter: `${tabUrl}*`,
            resourceTypes: [
              'font',
              'image',
              'main_frame',
              'media',
              'ping',
              'script',
              'stylesheet',
              'sub_frame',
              'websocket',
              'xmlhttprequest',
              'other'
            ]
          }
        }
      ]
    });

    browser.alarms.create(`delete-net-request-session-rule_${ruleId}`, {
      delayInMinutes: 2
    });
  } else if (mv3) {
    await browser.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId],
      addRules: [
        {
          id: ruleId,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              {header: 'User-Agent', operation: 'set', value: userAgent}
            ]
          },
          condition: {
            tabIds: [tabId],
            resourceTypes: [
              'font',
              'image',
              'main_frame',
              'media',
              'ping',
              'script',
              'stylesheet',
              'sub_frame',
              'websocket',
              'xmlhttprequest',
              'other'
            ]
          }
        }
      ]
    });

    browser.alarms.create(`delete-net-request-session-rule_${ruleId}`, {
      delayInMinutes: 2
    });
  } else {
    setWebRequestUserAgentHeader({tabId, userAgent});
  }
}

function setWebRequestUserAgentHeader({tabId, userAgent} = {}) {
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

async function createMenuItem(item) {
  return new Promise((resolve, reject) => {
    let menuItemId;

    function callback() {
      if (browser.runtime.lastError) {
        reject(browser.runtime.lastError);
      }

      resolve(menuItemId);
    }

    // creates context menu item for current instance
    menuItemId = browser.contextMenus.create(item, callback);
  });
}

async function removeMenuItem(menuItemId, {throwError = false} = {}) {
  try {
    // removes context menu item from current instance
    await browser.contextMenus.remove(menuItemId);
  } catch (err) {
    if (throwError) {
      throw err;
    }
  }
}

async function createMenu() {
  const context = {
    name: 'private',
    active: browser.extension.inIncognitoContext
  };

  const {menuItems: currentItems} = await storage.get('menuItems', {context});

  for (const itemId of currentItems) {
    await removeMenuItem(itemId);
  }

  const {showInContextMenu} = await storage.get('showInContextMenu');
  const newItems = showInContextMenu ? await getMenuItems() : [];

  await storage.set({menuItems: newItems.map(item => item.id)}, {context});

  try {
    for (const item of newItems) {
      await createMenuItem(item);
    }
  } catch (err) {
    // removes context menu items from all instances
    await browser.contextMenus.removeAll();

    throw err;
  }
}

async function getMenuItem({
  id,
  title = '',
  contexts,
  parent,
  type = 'normal',
  documentUrlPatterns,
  targetUrlPatterns,
  icons
}) {
  const params = {
    id,
    title,
    contexts,
    parentId: parent,
    type
  };

  if (documentUrlPatterns) {
    params.documentUrlPatterns = documentUrlPatterns;
  }
  if (targetUrlPatterns) {
    params.targetUrlPatterns = targetUrlPatterns;
  }
  if (icons) {
    params.icons = icons;
  }

  return params;
}

async function getMenuItems() {
  const env = await getPlatform();

  const options = await storage.get(optionKeys);

  const contexts = [
    'audio',
    'editable',
    'frame',
    'image',
    'link',
    'selection',
    'video'
  ];
  if (env.isFirefox) {
    contexts.push('password');
  }
  if (!env.isAndroid) {
    contexts.push('page');
  }

  const setIcons = env.isFirefox && options.showEngineIcons;

  let theme;
  if (setIcons) {
    theme = await getAppTheme(options.appTheme);
  }

  const documentUrlPatterns = ['http://*/*', 'https://*/*'];
  if (!['safari', 'samsung'].includes(targetEnv)) {
    documentUrlPatterns.push('file:///*');
  }

  const extUrlPattern = getExtensionUrlPattern();
  const searchAllEngines =
    !env.isSamsung && options.searchAllEnginesContextMenu;
  const viewEnabled = options.viewImageContextMenu;
  const shareEnabled = options.shareImageContextMenu && canShare(env);

  const enEngines = await getEnabledEngines(options);

  const items = [];

  if (enEngines.length === 1) {
    const engine = enEngines[0];
    const title = getText(
      'mainMenuItemTitle_engine',
      getText(`menuItemTitle_${engine}`)
    );

    items.push(
      await getMenuItem({
        id: `search_${engine}_1`,
        title,
        contexts,
        documentUrlPatterns
      })
    );

    if (extUrlPattern) {
      items.push(
        await getMenuItem({
          id: `search_${engine}_2`,
          title,
          contexts: ['image'],
          documentUrlPatterns: [extUrlPattern]
        })
      );
    }
  } else if (enEngines.length > 1 && searchAllEngines === 'main') {
    const title = getText('mainMenuItemTitle_allEngines');

    items.push(
      await getMenuItem({
        id: 'search_allEngines_1',
        title,
        contexts,
        documentUrlPatterns
      })
    );

    if (extUrlPattern) {
      items.push(
        await getMenuItem({
          id: 'search_allEngines_2',
          title,
          contexts: ['image'],
          documentUrlPatterns: [extUrlPattern]
        })
      );
    }
  } else if (enEngines.length > 1) {
    let addSeparator = false;

    if (viewEnabled) {
      const title = getText('menuItemTitle_viewImage');

      items.push(
        await getMenuItem({
          id: 'view_1',
          title,
          contexts,
          documentUrlPatterns
        })
      );

      if (extUrlPattern) {
        items.push(
          await getMenuItem({
            id: 'view_2',
            title,
            contexts: ['image'],
            documentUrlPatterns: [extUrlPattern]
          })
        );
      }

      addSeparator = true;
    }

    if (shareEnabled) {
      const title = getText('menuItemTitle_shareImage');

      items.push(
        await getMenuItem({
          id: 'share_1',
          title,
          contexts,
          documentUrlPatterns
        })
      );

      if (extUrlPattern) {
        items.push(
          await getMenuItem({
            id: 'share_2',
            title,
            contexts: ['image'],
            documentUrlPatterns: [extUrlPattern]
          })
        );
      }

      addSeparator = true;
    }

    if (addSeparator && !env.isSamsung) {
      // Samsung Internet: separator not visible, creates gap that responds to input.
      items.push(
        await getMenuItem({
          id: 'sep_1',
          contexts,
          type: 'separator',
          documentUrlPatterns
        })
      );

      if (extUrlPattern) {
        items.push(
          await getMenuItem({
            id: 'sep_2',
            type: 'separator',
            contexts: ['image'],
            documentUrlPatterns: [extUrlPattern]
          })
        );
      }
    }

    if (searchAllEngines === 'sub') {
      const title = getText('menuItemTitle_allEngines');
      const icons =
        setIcons && getEngineMenuIcon('allEngines', {variant: theme});

      items.push(
        await getMenuItem({
          id: 'search_allEngines_1',
          title,
          contexts,
          documentUrlPatterns,
          icons
        })
      );

      if (extUrlPattern) {
        items.push(
          await getMenuItem({
            id: 'search_allEngines_2',
            title,
            contexts: ['image'],
            documentUrlPatterns: [extUrlPattern],
            icons
          })
        );
      }

      if (!env.isSamsung) {
        // Samsung Internet: separator not visible, creates gap that responds to input.
        items.push(
          await getMenuItem({
            id: 'sep_3',
            contexts,
            type: 'separator',
            documentUrlPatterns
          })
        );

        if (extUrlPattern) {
          items.push(
            await getMenuItem({
              id: 'sep_4',
              type: 'separator',
              contexts: ['image'],
              documentUrlPatterns: [extUrlPattern]
            })
          );
        }
      }
    }

    for (const engine of enEngines) {
      const title = getText(`menuItemTitle_${engine}`);
      const icons = setIcons && getEngineMenuIcon(engine, {variant: theme});

      items.push(
        await getMenuItem({
          id: `search_${engine}_1`,
          title,
          contexts,
          documentUrlPatterns,
          icons
        })
      );

      if (extUrlPattern) {
        items.push(
          await getMenuItem({
            id: `search_${engine}_2`,
            title,
            contexts: ['image'],
            documentUrlPatterns: [extUrlPattern],
            icons
          })
        );
      }
    }
  }

  return items;
}

async function openContentView(message, view) {
  const tabId = message.session.sourceTabId;

  if (!(await hasModule({tabId, module: 'base'}))) {
    await showNotification({messageId: 'error_scriptsNotAllowed'});
    return;
  }

  if (!(await hasModule({tabId, module: 'content'}))) {
    await executeScript({files: ['/src/content/script.js'], tabId});
  }

  await sendLargeMessage({
    target: 'tab',
    tabId,
    frameId: 0,
    message: {
      id: 'openView',
      ...message,
      view
    }
  });
}

async function showContentSelectionPointer(tabId) {
  return executeScript({
    func: () => {
      if (typeof addTouchListener !== 'undefined') {
        self.addTouchListener();
        self.showPointer();
      }
    },
    code: `
      if (typeof addTouchListener !== 'undefined') {
        addTouchListener();
        showPointer();
      }
    `,
    tabId,
    allFrames: true
  });
}

async function hideContentSelectionPointer(tabId) {
  return executeScript({
    func: () => {
      if (typeof removeTouchListener !== 'undefined') {
        self.removeTouchListener();
        self.hidePointer();
      }
    },
    code: `
      if (typeof removeTouchListener !== 'undefined') {
        removeTouchListener();
        hidePointer();
      }
    `,
    tabId,
    allFrames: true
  });
}

async function getTabUrl(session, search, image, taskId) {
  const engine = search.engine;
  let tabUrl = engines[engine][search.assetType].target;

  if (search.isTaskId) {
    tabUrl = tabUrl.replace('{id}', taskId);
  }

  if (search.assetType === 'url') {
    let imgUrl = image.imageUrl;
    if (engine !== 'ascii2d') {
      imgUrl = encodeURIComponent(imgUrl);
    }
    tabUrl = tabUrl.replace('{imgUrl}', imgUrl);

    if (engine === 'google' && !session.options.localGoogle) {
      tabUrl = `${tabUrl}&gws_rd=cr&gl=US`;
    }
  }

  return tabUrl;
}

async function initSearch(session, images) {
  if (['chrome', 'opera'].includes(targetEnv)) {
    checkSearchEngineAccess();
  }

  if (!Array.isArray(images)) {
    images = [images];
  }

  const tab = await browser.tabs.get(session.sourceTabId);
  session.sourceTabIndex = tab.index;

  let firstBatchItem = true;
  for (const image of images) {
    await searchImage(session, image, firstBatchItem);
    firstBatchItem = false;
  }
}

async function searchImage(session, image, firstBatchItem = true) {
  let tabActive = firstBatchItem;

  let contributePageTabId;

  if (firstBatchItem) {
    const contribPageTab = await processAppUse();

    if (contribPageTab) {
      contributePageTabId = contribPageTab.id;
      session.sourceTabIndex = contribPageTab.index;
      tabActive = false;
    }
  }

  tabActive = !session.options.tabInBackgound && tabActive;

  const supportedEngines = await getSupportedEngines(
    image,
    session.engines,
    session.searchMode
  );
  const unsupportedEngines = session.engines.filter(
    item => !supportedEngines.includes(item)
  );
  if (unsupportedEngines.length) {
    await showNotification({
      messageId: 'error_invalidSearchMethod',
      type: 'unsupportedError'
    });
  }

  const searches = await getSearches(
    image,
    supportedEngines,
    session.searchMode
  );

  const altReceiptSearches = searches.filter(item => item.isAltImage);

  let altImage, altImageId;
  if (altReceiptSearches.length) {
    altImage = await convertProcessedImage(image, {newType: 'image/png'});

    if (altImage) {
      altImageId = await registry.addStorageItem(altImage, {
        receipts: {expected: altReceiptSearches.length, received: 0},
        expiryTime: 10.0,
        area: 'indexeddb'
      });
    }
  }

  const receiptSearches = searches.filter(
    item => item.sendsReceipt && (!altImageId || !item.isAltImage)
  );

  let imageId;
  if (receiptSearches.length) {
    imageId = await registry.addStorageItem(image, {
      receipts: {expected: receiptSearches.length, received: 0},
      expiryTime: 10.0,
      area: 'indexeddb'
    });
  }

  let firstEngine = firstBatchItem;
  for (const search of searches) {
    session.sourceTabIndex += 1;

    let img, imgId;
    if (search.isAltImage && altImageId) {
      img = altImage;
      imgId = altImageId;
    } else {
      img = image;
      imgId = imageId;
    }

    await searchEngine(session, search, img, imgId, tabActive);

    if (firstEngine && session.closeSourceTab) {
      await browser.tabs.remove(session.sourceTabId);
      session.sourceTabId = -1;
      session.sourceTabIndex -= 1;
    }

    tabActive = false;
    firstEngine = false;
  }

  if ((await isAndroid()) && contributePageTabId) {
    await browser.tabs.update(contributePageTabId, {active: true});
  }
}

async function searchEngine(session, search, image, imageId, tabActive) {
  let taskId;
  if (search.sendsReceipt) {
    taskId = await registry.addStorageItem(
      {session, search, imageId},
      {
        receipts: {expected: 1, received: 0},
        expiryTime: 10.0,
        isTask: true
      }
    );
  }

  const token = uuidv4();
  const beaconToken = targetEnv === 'samsung' ? uuidv4() : '';

  const tabUrl = await getTabUrl(session, search, image, taskId);

  const setupSteps = [];

  const userAgent = await getRequiredUserAgent(search.engine);
  if (userAgent) {
    setupSteps.push({id: 'setUserAgent', tabUrl, userAgent, beaconToken});
  }

  if (search.sendsReceipt) {
    setupSteps.push({id: 'addTask', taskId});
  }

  const storageItem = {
    tabUrl: beaconToken ? getNewTabUrl(beaconToken) : tabUrl,
    keepHistory: false
  };

  if (setupSteps.length) {
    storageItem.setupSteps = setupSteps;
  }

  await registry.addStorageItem(storageItem, {
    receipts: {expected: 1, received: 0},
    expiryTime: 1.0,
    token
  });

  if (beaconToken) {
    await registry.addStorageItem(
      {tabUrl, keepHistory: false},
      {
        receipts: {expected: 1, received: 0},
        expiryTime: 1.0,
        token: beaconToken
      }
    );
  }

  await createTab({token, index: session.sourceTabIndex, active: tabActive});
}

async function setupTab(sender, steps) {
  const results = {};

  for (const step of steps) {
    if (step.id === 'setUserAgent') {
      await setTabUserAgent({
        tabId: sender.tab.id,
        tabUrl: step.tabUrl,
        userAgent: step.userAgent,
        beaconToken: step.beaconToken
      });

      results[step.id] = '';
    } else if (step.id === 'addTask') {
      await registry.addTaskRegistryItem({
        taskId: step.taskId,
        tabId: sender.tab.id
      });

      results[step.id] = '';
    }
  }

  return results;
}

async function setTabUserAgent({tabId, tabUrl, userAgent, beaconToken} = {}) {
  if (targetEnv === 'samsung') {
    // Samsung Internet 13: webRequest listener filtering by tab ID
    // provided by tabs.createTab returns requests from different tab.

    function requestCallback(details) {
      removeCallback();
      setWebRequestUserAgentHeader({tabId: details.tabId, userAgent});
    }

    const removeCallback = function () {
      window.clearTimeout(timeoutId);
      browser.webRequest.onBeforeRequest.removeListener(requestCallback);
    };
    const timeoutId = window.setTimeout(removeCallback, 10000); // 10 seconds

    browser.webRequest.onBeforeRequest.addListener(
      requestCallback,
      {
        urls: [getNewTabUrl(beaconToken)],
        types: ['main_frame']
      },
      ['blocking']
    );
  } else {
    await setUserAgentHeader({tabId, tabUrl, userAgent});
  }
}

async function getRequiredUserAgent(engine) {
  if (await isMobile()) {
    // Google only works with a Chrome user agent on Firefox for Android,
    // while other search engines may need a desktop user agent.
    if (targetEnv === 'firefox' && ['google', 'ikea'].includes(engine)) {
      return chromeMobileUA;
    } else if (['googleLens'].includes(engine)) {
      return chromeDesktopUA;
    }
  }
}

async function execEngine(tabId, engine, taskId) {
  if (['bing'].includes(engine)) {
    await insertCSS({files: [`/src/engines/css/${engine}.css`], tabId});
  }

  await executeScript({
    func: taskId => (self.taskId = taskId),
    args: [taskId],
    code: `self.taskId = '${taskId}'`,
    tabId
  });
  await executeScript({files: ['/src/commons-engine/script.js'], tabId});
  await executeScript({files: [`/src/engines/${engine}/script.js`], tabId});
}

async function searchClickTarget(session) {
  const isParseModule = await hasModule({
    tabId: session.sourceTabId,
    frameId: session.sourceFrameId,
    module: 'parse'
  });

  if (!isParseModule) {
    await executeScript({
      files: ['/src/parse/script.js'],
      tabId: session.sourceTabId,
      frameIds: [session.sourceFrameId]
    });
  }

  await browser.tabs.sendMessage(
    session.sourceTabId,
    {
      id: 'parsePage',
      session
    },
    {frameId: session.sourceFrameId}
  );
}

async function handleParseResults(session, images) {
  if (!images.length) {
    await showNotification({messageId: 'error_imageNotFound'});
  } else if (images.length > 1 || images[0].mustConfirm) {
    await openContentView({session, images}, 'confirm');
  } else {
    if (session.sessionType === 'search') {
      await initSearch(session, images);
    } else if (session.sessionType === 'view') {
      await viewImage(session, images[0]);
    }
  }
}

async function onContextMenuItemClick(info, tab) {
  if (targetEnv === 'samsung' && (await isValidTab({tab}))) {
    // Samsung Internet 13: contextMenus.onClicked provides wrong tab index.
    tab = await browser.tabs.get(tab.id);
  }

  const [sessionType, engine] = info.menuItemId.split('_');

  const sessionData = {
    sessionOrigin: 'context',
    sessionType,
    sourceTabId: tab.id,
    sourceTabIndex: tab.index,
    sourceFrameId: typeof info.frameId !== 'undefined' ? info.frameId : 0
  };
  if (sessionType === 'search') {
    sessionData.engine = engine;
  }

  const session = await createSession(sessionData);

  if (sessionType === 'view') {
    if (
      !(await hasModule({
        tabId: session.sourceTabId,
        frameId: session.sourceFrameId,
        module: 'base'
      }))
    ) {
      let processedImage;

      const url = getImageUrlFromContextMenuEvent(info);

      if (url) {
        processedImage = await processImageUrl(url, {session});
      }

      if (processedImage) {
        await viewImage(session, processedImage);
      } else {
        await showNotification({messageId: 'error_scriptsNotAllowed'});
      }
    } else {
      await searchClickTarget(session);
    }
  } else if (sessionType === 'share') {
    if (
      !(await hasModule({
        tabId: session.sourceTabId,
        frameId: session.sourceFrameId,
        module: 'base'
      }))
    ) {
      await showNotification({messageId: 'error_scriptsNotAllowed'});
    } else {
      await searchClickTarget(session);
    }
  } else if (sessionType === 'search') {
    if (session.searchMode === 'capture') {
      if (
        !(await hasModule({
          tabId: session.sourceTabId,
          frameId: session.sourceFrameId,
          module: 'base'
        }))
      ) {
        await showNotification({messageId: 'error_scriptsNotAllowed'});
      } else {
        await openContentView({session}, 'capture');
      }
    } else {
      if (
        !(await hasModule({
          tabId: session.sourceTabId,
          frameId: session.sourceFrameId,
          module: 'base'
        }))
      ) {
        let processedImage;

        const url = getImageUrlFromContextMenuEvent(info);

        if (url) {
          processedImage = await processImageUrl(url, {session});
        }

        if (processedImage) {
          await initSearch(session, processedImage);
        } else {
          await showNotification({messageId: 'error_scriptsNotAllowed'});
        }
      } else {
        await searchClickTarget(session);
      }
    }
  }
}

async function onActionClick(session, tabUrl) {
  if (session.searchMode === 'browse') {
    const browseUrl = browser.runtime.getURL('/src/browse/index.html');
    const storageId = await registry.addStorageItem(session, {
      receipts: {expected: 1, received: 0},
      expiryTime: 1.0
    });

    await createTab({
      url: `${browseUrl}?id=${storageId}`,
      index: session.sourceTabIndex + 1,
      openerTabId: await getOpenerTabId({tabId: session.sourceTabId})
    });
  } else if (session.searchMode === 'capture') {
    await openContentView({session}, 'capture');
  } else if (['selectUrl', 'selectImage'].includes(session.searchMode)) {
    if (
      tabUrl.startsWith('file://') &&
      ['safari', 'samsung'].includes(targetEnv)
    ) {
      await showNotification({messageId: 'error_invalidImageUrl_fileUrl'});
      return;
    }

    await openContentView({session}, 'select');

    if (await hasModule({tabId: session.sourceTabId, module: 'base'})) {
      await showContentSelectionPointer(session.sourceTabId);
    }
  }
}

async function onActionButtonClick(tab) {
  if (targetEnv === 'samsung' && (await isValidTab({tab}))) {
    // Samsung Internet 13: browserAction.onClicked provides wrong tab index.
    tab = await browser.tabs.get(tab.id);
  }

  const session = await createSession({
    sessionOrigin: 'action',
    sessionType: 'search',
    sourceTabId: tab.id,
    sourceTabIndex: tab.index
  });

  if (session.searchMode === 'url') {
    await showNotification({
      messageId: (await isMobile())
        ? 'error_invalidSearchModeMobile_url'
        : 'error_invalidSearchMode_url'
    });
    return;
  }

  const enabledEngines = await getEnabledEngines(session.options);

  if (!enabledEngines.length) {
    await showNotification({messageId: 'error_allEnginesDisabled'});
    return;
  }

  if (
    session.options.searchAllEnginesAction === 'main' &&
    enabledEngines.length > 1
  ) {
    session.engineGroup = 'allEngines';
    session.engines = enabledEngines;
  } else {
    session.engines.push(enabledEngines[0]);
  }

  onActionClick(session, tab.url);
}

async function onActionPopupClick(engine, images, imageUrl) {
  const {searchModeAction} = await storage.get('searchModeAction');

  const tab = await getActiveTab();

  const session = await createSession({
    sessionOrigin: 'action',
    sessionType: 'search',
    searchMode: searchModeAction,
    sourceTabId: tab.id,
    sourceTabIndex: tab.index,
    engine
  });

  if (searchModeAction === 'browse' && images) {
    await initSearch(session, images);
  } else if (searchModeAction === 'url' && imageUrl) {
    await initSearch(session, {imageUrl});
  } else {
    onActionClick(session, tab.url);
  }
}

async function initShare() {
  const tab = await getActiveTab();

  const session = await createSession({
    sessionOrigin: 'action',
    sessionType: 'share',
    sourceTabId: tab.id,
    sourceTabIndex: tab.index
  });

  await openContentView({session}, 'select');

  if (await hasModule({tabId: session.sourceTabId, module: 'base'})) {
    await showContentSelectionPointer(session.sourceTabId);
  }
}

async function initView() {
  const tab = await getActiveTab();

  const session = await createSession({
    sessionOrigin: 'action',
    sessionType: 'view',
    sourceTabId: tab.id,
    sourceTabIndex: tab.index
  });

  await openContentView({session}, 'select');

  if (await hasModule({tabId: session.sourceTabId, module: 'base'})) {
    await showContentSelectionPointer(session.sourceTabId);
  }
}

async function viewImage(session, image) {
  let tabUrl;

  if (image.hasOwnProperty('imageDataUrl')) {
    const storageId = await registry.addStorageItem(image, {
      receipts: {expected: 1, received: 0},
      expiryTime: 1.0,
      area: 'memory'
    });

    tabUrl = `${browser.runtime.getURL(
      '/src/view/index.html'
    )}?id=${storageId}`;
  } else {
    tabUrl = image.imageUrl;
  }

  await browser.tabs.create({url: tabUrl, index: session.sourceTabIndex + 1});
}

async function setContextMenu() {
  if (['chrome', 'edge', 'opera'].includes(targetEnv)) {
    // notify all background script instances
    await storage.set(
      {setContextMenuEvent: Date.now()},
      {area: mv3 ? 'session' : 'local'}
    );
  } else {
    await createMenu();
  }
}

async function setBrowserAction() {
  const options = await storage.get([
    'engines',
    'disabledEngines',
    'searchAllEnginesAction'
  ]);
  const enEngines = await getEnabledEngines(options);

  const action = mv3 ? browser.action : browser.browserAction;

  if (enEngines.length === 1) {
    action.setTitle({
      title: getText(
        'actionTitle_engine',
        getText(`menuItemTitle_${enEngines[0]}`)
      )
    });
    action.setPopup({popup: ''});
    return;
  }

  if (options.searchAllEnginesAction === 'main' && enEngines.length > 1) {
    action.setTitle({
      title: getText('actionTitle_allEngines')
    });
    action.setPopup({popup: ''});
    return;
  }

  action.setTitle({title: getText('extensionName')});
  if (!enEngines.length) {
    action.setPopup({popup: ''});
  } else {
    action.setPopup({popup: '/src/action/index.html'});
  }
}

async function getMessagePort(id) {
  return registry.getStorageItem({storageId: id, saveReceipt: true});
}

async function setMessagePort(id, port) {
  await registry.addStorageItem(port, {
    receipts: {expected: 1, received: 0},
    expiryTime: 1.0,
    area: 'memory',
    token: id
  });
}

async function processMessage(request, sender) {
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
    onActionPopupClick(request.engine, request.images, request.imageUrl);
  } else if (request.id === 'imageBrowseSubmit') {
    const session = request.session;
    session.sourceTabId = sender.tab.id;
    session.sourceTabIndex = sender.tab.index;

    initSearch(session, request.images);
  } else if (request.id === 'imageSelectionSubmit') {
    hideContentSelectionPointer(sender.tab.id);
    searchClickTarget(request.session);
  } else if (request.id === 'imageConfirmationSubmit') {
    browser.tabs.sendMessage(
      sender.tab.id,
      {id: 'closeView', view: 'confirm'},
      {frameId: 0}
    );

    if (request.session.sessionType === 'search') {
      await initSearch(request.session, request.image);
    } else if (request.session.sessionType === 'view') {
      await viewImage(request.session, request.image);
    }
  } else if (request.id === 'imageCaptureSubmit') {
    const tabId = sender.tab.id;
    browser.tabs.sendMessage(
      tabId,
      {id: 'closeView', view: 'capture'},
      {frameId: 0}
    );

    const image = await captureImage(request.area, tabId);

    initSearch(request.session, image);
  } else if (request.id === 'pageParseSubmit') {
    if (
      request.session.sessionOrigin === 'action' &&
      request.images.length <= 1 &&
      !request.images[0]?.mustConfirm
    ) {
      browser.tabs.sendMessage(
        sender.tab.id,
        {id: 'closeView', view: 'select'},
        {frameId: 0}
      );
    }

    handleParseResults(request.session, request.images);
  } else if (request.id === 'initShare') {
    initShare();
  } else if (request.id === 'initView') {
    initView();
  } else if (request.id === 'pageParseError') {
    if (request.session.sessionOrigin === 'action') {
      browser.tabs.sendMessage(
        sender.tab.id,
        {id: 'closeView', view: 'select'},
        {frameId: 0}
      );
    }

    showNotification({messageId: 'error_pageParseError'});
  } else if (request.id === 'addContentRequestListener') {
    return addContentRequestListener({
      url: request.url,
      origin: request.origin,
      referrer: request.referrer,
      tabId: sender.tab.id,
      token: request.token
    });
  } else if (request.id === 'removeContentRequestListener') {
    await removeContentRequestListener({ruleId: request.ruleId});
  } else if (request.id === 'fetchImage') {
    const imageBlob = await fetchImage(request.url);
    const imageDataUrl = imageBlob && (await blobToDataUrl(imageBlob));
    return Promise.resolve(imageDataUrl);
  } else if (request.id === 'notification') {
    showNotification({
      message: request.message,
      messageId: request.messageId,
      title: request.title,
      type: request.type
    });
  } else if (request.id === 'routeMessage') {
    const routedMessage = request.message;
    if (request.setSenderTabId) {
      routedMessage.senderTabId = sender.tab.id;
    }
    if (request.setSenderFrameId) {
      routedMessage.senderFrameId = sender.frameId;
    }

    const params = [
      request.messageTabId ? request.messageTabId : sender.tab.id,
      routedMessage
    ];
    if (request.hasOwnProperty('messageFrameId')) {
      params.push({frameId: request.messageFrameId});
    }

    browser.tabs.sendMessage(...params);
  } else if (request.id === 'sendNativeMessage') {
    const response = await browser.runtime.sendNativeMessage(
      'application.id',
      request.message
    );
    return Promise.resolve({response});
  } else if (request.id === 'getPlatform') {
    return getPlatform();
  } else if (request.id === 'storageRequest') {
    const data = await registry.getStorageItem({
      storageId: request.storageId,
      saveReceipt: request.saveReceipt
    });
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
  } else if (request.id === 'storageReceipt') {
    for (const storageId of request.storageIds) {
      await registry.saveStorageItemReceipt({storageId});
    }
  } else if (request.id === 'taskRequest') {
    const taskIndex = await registry.getTaskRegistryItem({
      tabId: sender.tab.id
    });
    if (taskIndex && Date.now() - taskIndex.addTime < 600000) {
      const task = await registry.getStorageItem({storageId: taskIndex.taskId});
      if (task && task.search.isExec) {
        execEngine(sender.tab.id, task.search.engine, taskIndex.taskId);
      }
    }
  } else if (request.id === 'optionChange') {
    await onOptionChange();
  } else if (request.id === 'searchImage') {
    const {session, search, image} = request;
    if (search.assetType === 'image') {
      image.imageBlob = dataUrlToBlob(image.imageDataUrl);
    }

    try {
      let data;
      if (search.engine === 'google') {
        data = await searchGoogle({session, search, image});
      } else if (search.engine === 'pinterest') {
        data = await searchPinterest({session, search, image});
      }

      return Promise.resolve({data});
    } catch (err) {
      return Promise.resolve({error: err.toString()});
    }
  } else if (request.id === 'showPage') {
    await showPage({url: request.url});
  } else if (request.id === 'setupTab') {
    return setupTab(sender, request.steps);
  } else if (request.id === 'executeScript') {
    const params = request.params;
    if (request.setSenderTabId) {
      params.tabId = sender.tab.id;
    }
    if (request.setSenderFrameId) {
      params.frameIds = [sender.frameId];
    }

    if (params.func) {
      params.func = getScriptFunction(params.func);
    }

    return executeScript(params);
  }
}

async function processConnection(port) {
  if (port.name?.startsWith('message')) {
    const id = port.name.split('_')[1];

    await setMessagePort(id, port);

    port.postMessage({transfer: {type: 'connection', complete: true, id}});
  }
}

function onMessage(request, sender, sendResponse) {
  const response = processLargeMessage({
    request,
    sender,
    requestHandler: processMessage,
    messagePortProvider: getMessagePort
  });

  return processMessageResponse(response, sendResponse);
}

function onConnect(port) {
  processConnection(port);
}

async function onOptionChange() {
  await setupUI();
}

async function onStorageChange(changes, area) {
  if (changes.setContextMenuEvent?.newValue) {
    if (await isStorageReady({area: mv3 ? 'session' : 'local'})) {
      await queue.add(createMenu);
    }
  }
}

async function onAlarm({name}) {
  if (name.startsWith('delete-storage-item')) {
    const storageId = name.split('_')[1];
    await registry.deleteStorageItem({storageId});
  } else if (name.startsWith('delete-net-request-session-rule')) {
    const ruleId = stringToInt(name.split('_')[1]);
    await browser.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId]
    });
  }
}

async function onInstall(details) {
  if (['install', 'update'].includes(details.reason)) {
    await setup({event: 'install'});
  }
}

async function onStartup() {
  await setup({event: 'startup'});
}

function addContextMenuListener() {
  if (browser.contextMenus) {
    browser.contextMenus.onClicked.addListener(onContextMenuItemClick);
  }
}

function addActionListener() {
  if (mv3) {
    browser.action.onClicked.addListener(onActionButtonClick);
  } else {
    browser.browserAction.onClicked.addListener(onActionButtonClick);
  }
}

function addStorageListener() {
  browser.storage.onChanged.addListener(onStorageChange);
}

function addMessageListener() {
  browser.runtime.onMessage.addListener(onMessage);
}

function addConnectListener() {
  browser.runtime.onConnect.addListener(onConnect);
}

function addAlarmListener() {
  browser.alarms.onAlarm.addListener(onAlarm);
}

function addInstallListener() {
  browser.runtime.onInstalled.addListener(onInstall);
}

function addStartupListener() {
  browser.runtime.onStartup.addListener(onStartup);
}

async function setupUI() {
  const items = [setBrowserAction];

  if (await isContextMenuSupported()) {
    items.push(setContextMenu);
  }

  await queue.addAll(items);
}

async function setup({event = ''} = {}) {
  const startup = await getStartupState({event});

  if (startup.setupInstance) {
    await runOnce('setupInstance', async () => {
      if (!(await isStorageReady())) {
        await initStorage({data: startup});
      }

      if (['chrome', 'edge', 'opera', 'samsung'].includes(targetEnv)) {
        await insertBaseModule();
      }

      if (startup.update) {
        await setAppVersion();
      }
    });
  }

  if (startup.setupSession) {
    await runOnce('setupSession', async () => {
      if (mv3 && !(await isStorageReady({area: 'session'}))) {
        await initStorage({area: 'session', silent: true});
      }

      if (['samsung'].includes(targetEnv) && !startup.setupInstance) {
        // Samsung Internet: Content script does not always run in restored
        // active tab on startup.
        await insertBaseModule({activeTab: true});
      }

      await setupUI();
      await registry.cleanupRegistry();
    });
  }
}

function init() {
  addContextMenuListener();
  addActionListener();
  addMessageListener();
  addConnectListener();
  addStorageListener();
  addAlarmListener();
  addInstallListener();
  addStartupListener();

  setup();
}

init();
