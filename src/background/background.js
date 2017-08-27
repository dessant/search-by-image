import _ from 'lodash';
import uuidV4 from 'uuid/v4';

import storage from 'storage/storage';
import {
  getText,
  createTab,
  executeCode,
  executeFile,
  getRandomString,
  getRandomInt
} from 'utils/common';
import {getDataUriMimeType} from 'content/common';
import {
  getEnabledEngines,
  showNotification,
  getRandomFilename
} from 'utils/app';
import {optionKeys, engines, imageMimeTypes} from 'utils/data';

var dataUriStore = {};

function saveDataUri(dataUri) {
  const dataKey = uuidV4();
  dataUriStore[dataKey] = dataUri;
  window.setTimeout(function() {
    delete dataUriStore[dataKey];
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
      contexts: ['all'],
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

async function getTabUrl(imgUrl, dataKey, engineId, options) {
  let tabUrl;

  if (dataKey) {
    const supportedEngines = ['bing', 'yandex', 'baidu', 'sogou'];
    if (supportedEngines.indexOf(engineId) !== -1) {
      tabUrl = engines[engineId].data;
    } else {
      tabUrl = `${browser.extension.getURL(
        '/src/upload/index.html'
      )}?engine=${engineId}&dataKey=${dataKey}`;
    }
  } else {
    tabUrl = engines[engineId].url.replace(
      '{imgUrl}',
      encodeURIComponent(imgUrl)
    );
    if (engineId === 'google' && !options.localGoogle) {
      tabUrl = `${tabUrl}&gws_rd=cr`;
    }
  }

  return tabUrl;
}

async function searchImage(imgUrl, menuId, sourceTabIndex) {
  const options = await storage.get(optionKeys, 'sync');

  let tabIndex = sourceTabIndex + 1;
  let tabActive = !options.tabInBackgound;
  let dataKey = null;
  if (imgUrl.data.startsWith('data:')) {
    if (!_.has(imgUrl, 'info.filename') || !imgUrl.info.filename) {
      const ext = _.get(imageMimeTypes, getDataUriMimeType(imgUrl.data), '');
      imgUrl.info = {filename: getRandomString(getRandomInt(5, 20)), ext};
    }
    imgUrl.info.fullFilename = imgUrl.info.ext
      ? `${imgUrl.info.filename}.${imgUrl.info.ext}`
      : imgUrl.info.filename;

    dataKey = saveDataUri(imgUrl);
  }

  if (menuId === 'allEngines') {
    for (const engine of await getEnabledEngines(options)) {
      await searchEngine(imgUrl, dataKey, engine, options, tabIndex, tabActive);
      tabIndex = tabIndex + 1;
      tabActive = false;
    }
  } else {
    await searchEngine(imgUrl, dataKey, menuId, options, tabIndex, tabActive);
  }
}

async function searchEngine(
  imgUrl,
  dataKey,
  engineId,
  options,
  tabIndex,
  tabActive
) {
  const tabUrl = await getTabUrl(imgUrl.data, dataKey, engineId, options);
  const tab = await createTab(tabUrl, tabIndex, tabActive);
  if (dataKey) {
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
      executeCode(`var dataKey = '${dataKey}';`, tab.id);
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

  // Firefox < 55.0
  if (typeof info.frameId === 'undefined') {
    var frameId = 0;
  } else {
    frameId = info.frameId;
  }
  if (!frameId && info.pageUrl !== info.frameUrl) {
    if (info.srcUrl) {
      await searchImage(info.srcUrl, info.menuItemId, tab.index);
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
  ``;
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

function onMessage(request, sender, sendResponse) {
  if (request.id === 'dataUriRequest') {
    const dataUri = dataUriStore[request.dataKey];
    const response = {id: 'dataUriResponse'};
    if (dataUri) {
      response['dataUri'] = dataUri;
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
    showNotification(request.messageId);
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
