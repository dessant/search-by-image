import _ from 'lodash';
import uuidV4 from 'uuid/v4';

import storage from 'storage/storage';
import {getText, createTab} from 'utils/common';
import {getEnabledEngines} from 'utils/app';
import {optionKeys, engines} from 'utils/data';

var dataUriStore = {};

function saveDataUri(dataUri) {
  var dataKey = uuidV4();
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
      contexts: ['image'],
      parentId: parentId,
      type: type
    },
    onCreated
  );
}

async function createMenu() {
  var options = await storage.get(optionKeys, 'sync');
  var enEngines = await getEnabledEngines(options);

  if (_.size(enEngines) === 1) {
    const engine = enEngines[0];
    createMenuItem(
      engine,
      getText(
        'contextMenuItemTitle:engine:main',
        getText(`engineName:${engine}:short`)
      )
    );
    return;
  }

  if (_.size(enEngines) > 1) {
    var searchAllLocation =
      options.searchAllEngines && options.searchAllEnginesLocation;

    if (searchAllLocation === 'menu') {
      createMenuItem(
        'allEngines',
        getText('contextMenuItemTitle:allEngines:main')
      );
      return;
    }

    createMenuItem('par-1', getText('contextMenuGroupTitle:searchImage:main'));

    if (searchAllLocation === 'submenu') {
      createMenuItem(
        'allEngines',
        getText('contextMenuItemTitle:allEngines:sub'),
        'par-1'
      );
      createMenuItem('sep-1', '', 'par-1', 'separator');
    }

    _.forEach(enEngines, function(engineId) {
      createMenuItem(
        engineId,
        getText(`engineName:${engineId}:short`),
        'par-1'
      );
    });
  }
}

async function getTabUrl(imgUrl, dataKey, engineId, options) {
  if (dataKey) {
    var tabUrl = `${browser.extension.getURL(
      '/src/upload/index.html'
    )}?engine=${engineId}&dataKey=${dataKey}`;
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

async function searchImage(info, tab) {
  var options = await storage.get(optionKeys, 'sync');
  var imgUrl = info.srcUrl;
  var menuItemId = info.menuItemId;
  var newTabIndex = tab.index + 1;
  var newTabActive = !options.tabInBackgound;

  if (imgUrl.startsWith('data:')) {
    var dataKey = saveDataUri(imgUrl);
  } else {
    dataKey = null;
  }

  if (menuItemId === 'allEngines') {
    for (const engineId of await getEnabledEngines(options)) {
      const tabUrl = await getTabUrl(imgUrl, dataKey, engineId, options);
      await createTab(tabUrl, newTabIndex, newTabActive);
      newTabIndex = newTabIndex + 1;
      newTabActive = false;
    }
  } else {
    const tabUrl = await getTabUrl(imgUrl, dataKey, menuItemId, options);
    await createTab(tabUrl, newTabIndex, newTabActive);
  }
}

function onDataUriRequest(request, sender, sendResponse) {
  if (request.hasOwnProperty('dataKey')) {
    var dataUri = dataUriStore[request.dataKey];
    if (dataUri) {
      sendResponse({dataUri: dataUri});
      return;
    }
  }
  sendResponse({error: 'sessionExpired'});
}

function addMenuListener(data) {
  browser.contextMenus.onClicked.addListener(searchImage);
}

function addStorageListener() {
  browser.storage.onChanged.addListener(function(changes, area) {
    var removing = browser.contextMenus.removeAll();
    removing.then(createMenu);
  });
}

function addMessageListener() {
  browser.runtime.onMessage.addListener(onDataUriRequest);
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
