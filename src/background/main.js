import browser from 'webextension-polyfill';
import _ from 'lodash';
import uuidV4 from 'uuid/v4';

import storage from 'storage/storage';
import {
  getText,
  createTab,
  executeCode,
  executeFile,
  getRandomString,
  getRandomInt,
  dataUriToBlob,
  getDataUriMimeType
} from 'utils/common';
import {
  getEnabledEngines,
  showNotification,
  getRandomFilename
} from 'utils/app';
import {optionKeys, engines, imageMimeTypes, extensionStores} from 'utils/data';
import {targetEnv} from 'utils/config';

const imgDataStore = {};

function storeImgData(data) {
  data = _.cloneDeep(data);
  const dataKey = uuidV4();
  imgDataStore[dataKey] = data;
  window.setTimeout(function() {
    delete imgDataStore[dataKey];
    if (data.isBlob) {
      URL.revokeObjectURL(data.objectUrl);
    }
  }, 120000); // 2 minutes
  return dataKey;
}

function onCreated(n) {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  }
}

function createMenuItem(id, title, parentId, type = 'normal') {
  browser.contextMenus.create(
    {
      id: id,
      title: title,
      contexts: [
        'audio',
        'editable',
        'frame',
        'image',
        'link',
        'page',
        'selection',
        'video'
      ],
      documentUrlPatterns: [
        'http://*/*',
        'https://*/*',
        'ftp://*/*',
        'file:///*'
      ],
      parentId: parentId,
      type: type
    },
    onCreated
  );
}

async function createMenu() {
  const options = await storage.get(optionKeys, 'sync');
  const enEngines = await getEnabledEngines(options);

  if (enEngines.length === 1) {
    const engine = enEngines[0];
    createMenuItem(
      engine,
      getText(
        'contextMenuItemTitle_engine_main',
        getText(`engineName_${engine}_short`)
      )
    );
    return;
  }

  if (enEngines.length > 1) {
    const searchAllEngines = options.searchAllEnginesContextMenu;

    if (searchAllEngines === 'main') {
      createMenuItem(
        'allEngines',
        getText('contextMenuItemTitle_allEngines_main')
      );
      return;
    }

    createMenuItem('par-1', getText('contextMenuGroupTitle_searchImage_main'));

    if (searchAllEngines === 'sub') {
      createMenuItem(
        'allEngines',
        getText('engineName_allEngines_full'),
        'par-1'
      );
      createMenuItem('sep-1', '', 'par-1', 'separator');
    }

    enEngines.forEach(function(engineId) {
      createMenuItem(
        engineId,
        getText(`engineName_${engineId}_short`),
        'par-1'
      );
    });
  }
}

async function getTabUrl(imgData, engineId, options) {
  let tabUrl;

  if (imgData.isBlob) {
    const supportedEngines = ['bing', 'yandex', 'baidu', 'sogou'];
    if (supportedEngines.indexOf(engineId) !== -1) {
      tabUrl = engines[engineId].data;
    } else {
      tabUrl = `${browser.extension.getURL(
        '/src/upload/index.html'
      )}?engine=${engineId}&dataKey=${imgData.dataKey}`;
    }
  } else {
    tabUrl = engines[engineId].url.replace(
      '{imgUrl}',
      encodeURIComponent(imgData.url)
    );
    if (engineId === 'google' && !options.localGoogle) {
      tabUrl = `${tabUrl}&gws_rd=cr`;
    }
  }

  return tabUrl;
}

async function searchImage(img, menuId, sourceTabIndex) {
  const options = await storage.get(optionKeys, 'sync');

  let tabIndex = sourceTabIndex + 1;
  let tabActive = !options.tabInBackgound;
  let dataKey = '';
  const imgData = {
    isBlob: img.data.startsWith('data:')
  };

  if (imgData.isBlob) {
    if (!_.has(img, 'info.filename') || !img.info.filename) {
      const ext = _.get(imageMimeTypes, getDataUriMimeType(img.data), '');
      const filename = getRandomString(getRandomInt(5, 20));
      imgData.filename = ext ? `${filename}.${ext}` : filename;
    } else {
      imgData.filename = img.info.filename;
    }
    imgData.objectUrl = URL.createObjectURL(dataUriToBlob(img.data));
    imgData.dataKey = storeImgData(imgData);
  } else {
    imgData.url = img.data;
  }

  if (menuId === 'allEngines') {
    for (const engine of await getEnabledEngines(options)) {
      await searchEngine(imgData, engine, options, tabIndex, tabActive);
      tabIndex = tabIndex + 1;
      tabActive = false;
    }
  } else {
    await searchEngine(imgData, menuId, options, tabIndex, tabActive);
  }
}

async function searchEngine(imgData, engineId, options, tabIndex, tabActive) {
  const tabUrl = await getTabUrl(imgData, engineId, options);
  const tab = await createTab(tabUrl, tabIndex, tabActive);

  if (imgData.dataKey) {
    const cssNeeded = ['bing'];
    if (cssNeeded.indexOf(engineId) !== -1) {
      browser.tabs.insertCSS(tab.id, {
        runAt: 'document_start',
        file: '/src/content/engines/style.css'
      });
    }

    const commonNeeded = ['bing', 'yandex', 'baidu', 'sogou'];
    if (commonNeeded.indexOf(engineId) !== -1) {
      executeFile(`/src/content/common.js`, tab.id, 0, 'document_idle');
    }

    const supportedEngines = ['bing', 'yandex', 'baidu', 'sogou'];
    if (supportedEngines.indexOf(engineId) !== -1) {
      executeCode(`var dataKey = '${imgData.dataKey}';`, tab.id);
      executeFile(
        `/src/content/engines/${engineId}.js`,
        tab.id,
        0,
        'document_idle'
      );
    }
  }
}

async function onContextMenuClick(info, tab) {
  const tabId = tab.id;
  const frameId = typeof info.frameId !== 'undefined' ? info.frameId : 0;

  if (info.pageUrl.startsWith(extensionStores[targetEnv])) {
    if (info.srcUrl) {
      await searchImage({data: info.srcUrl}, info.menuItemId, tab.index);
    } else {
      await showNotification('error_scriptsNotAllowed');
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
      await searchImage({data: info.srcUrl}, info.menuItemId, tab.index);
    } else {
      await showNotification('error_imageNotFound');
    }
    return;
  }

  const [probe] = await executeFile('/src/content/probe.js', tabId, frameId);

  if (info.srcUrl) {
    const {imgFullParse} = await storage.get('imgFullParse', 'sync');
    await executeCode(
      `frameStorage.options.imgFullParse = ${imgFullParse};`,
      tabId,
      frameId
    );
  }

  if (!probe.modules.parse) {
    await executeFile('/src/content/parse.js', tabId, frameId);
    await rememberExecution('parse', tabId, frameId);
  }

  let [imgUrls] = await executeCode('parseDocument();', tabId, frameId);

  if (!imgUrls) {
    await showNotification('error_InternalError');
    return;
  }

  if (imgUrls.length === 0) {
    await showNotification('error_imageNotFound');
    return;
  }

  imgUrls = _.uniqBy(imgUrls, 'data');

  if (imgUrls.length > 1) {
    const [probe] = await executeFile('/src/content/probe.js', tabId);
    if (!probe.modules.select) {
      await browser.tabs.insertCSS(tabId, {
        runAt: 'document_end',
        file: '/src/select/frame.css'
      });
      await executeFile('/src/content/select.js', tabId);
      await rememberExecution('select', tabId);
    }

    await browser.tabs.sendMessage(
      tabId,
      {
        id: 'imageSelectionDialogUpdate',
        imgUrls: imgUrls,
        menuItemId: info.menuItemId
      },
      {frameId: 0}
    );
  } else {
    await searchImage(imgUrls[0], info.menuItemId, tab.index);
  }
}

function rememberExecution(module, tabId, frameId = 0) {
  return executeCode(`frameStorage.modules.${module} = true;`, tabId, frameId);
}

async function onMessage(request, sender, sendResponse) {
  if (request.id === 'imgDataRequest') {
    const imgData = imgDataStore[request.dataKey];
    const response = {id: 'imgDataResponse'};
    if (imgData) {
      response['imgData'] = imgData;
    } else {
      response['error'] = 'sessionExpired';
    }
    browser.tabs.sendMessage(sender.tab.id, response, {frameId: 0});
    return;
  }

  if (request.id === 'imageSelectionDialogSubmit') {
    searchImage(request.imgUrl, request.menuItemId, sender.tab.index);
    return;
  }

  if (request.id === 'notification') {
    showNotification(request.messageId, request.type);
  }
}

function addMenuListener(data) {
  browser.contextMenus.onClicked.addListener(onContextMenuClick);
}

function addStorageListener() {
  browser.storage.onChanged.addListener(function(changes, area) {
    const removing = browser.contextMenus.removeAll();
    removing.then(createMenu);
  });
}

function addMessageListener() {
  browser.runtime.onMessage.addListener(onMessage);
}

async function onLoad() {
  storage
    .init('sync')
    .then(createMenu)
    .then(addMenuListener)
    .then(addStorageListener)
    .then(addMessageListener);
}

document.addEventListener('DOMContentLoaded', onLoad);
