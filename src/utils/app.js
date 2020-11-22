import browser from 'webextension-polyfill';
import {difference} from 'lodash-es';
import fileType from 'file-type';

import storage from 'storage/storage';
import {
  getText,
  createTab,
  getActiveTab,
  getDataUrlMimeType,
  dataUrlToArray,
  blobToArray,
  blobToDataUrl,
  canvasToDataUrl,
  isAndroid
} from 'utils/common';
import {targetEnv} from 'utils/config';
import {engines, censoredEngines, imageMimeTypes, projectUrl} from 'utils/data';

async function getEnabledEngines(options) {
  if (typeof options === 'undefined') {
    options = await storage.get(['engines', 'disabledEngines'], 'sync');
  }
  return difference(options.engines, options.disabledEngines);
}

async function getSupportedEngines(image, engines, searchMode) {
  const supportedEngines = [];
  for (const engine of engines) {
    if (
      image.hasOwnProperty('imageDataUrl') ||
      (image.hasOwnProperty('imageUrl') &&
        (await hasUrlSupport(engine, {bypassBlocking: searchMode !== 'url'})))
    ) {
      supportedEngines.push(engine);
    }
  }

  return supportedEngines;
}

async function getSearches(image, targetEngines, searchMode) {
  const searches = [];
  for (const engine of targetEngines) {
    const method = (await isUploadSearch(image, engine, searchMode))
      ? 'upload'
      : 'url';
    const isExec = engines[engine][method].isExec;
    const isSessionKey = engines[engine][method].isSessionKey;
    searches.push({
      engine,
      method,
      isExec,
      isSessionKey,
      sendsReceipt: isExec || isSessionKey
    });
  }

  return searches;
}

async function isUploadSearch(image, engine, searchMode) {
  return (
    image.mustUpload ||
    !image.imageUrl ||
    !(await hasUrlSupport(engine, {bypassBlocking: searchMode !== 'url'}))
  );
}

async function hasUrlSupport(engine, {bypassBlocking = true} = {}) {
  const targetEngines =
    engine === 'allEngines' ? await getEnabledEngines() : [engine];
  const {bypassImageHostBlocking} = await storage.get(
    'bypassImageHostBlocking',
    'sync'
  );

  for (const engine of targetEngines) {
    if (
      !engines[engine].url ||
      (bypassBlocking &&
        bypassImageHostBlocking &&
        censoredEngines.includes(engine))
    ) {
      return false;
    }
  }

  return true;
}

function showNotification({message, messageId, title, type = 'info'}) {
  if (!title) {
    title = getText('extensionName');
  }
  if (messageId) {
    message = getText(messageId);
  }

  if (targetEnv === 'safari') {
    console.log('notification', message);
    return;
  }

  return browser.notifications.create(`sbi-notification-${type}`, {
    type: 'basic',
    title: title,
    message: message,
    iconUrl: '/src/icons/app/icon-48.png'
  });
}

function getListItems(data, {scope = '', shortScope = ''} = {}) {
  const labels = {};
  for (const [group, items] of Object.entries(data)) {
    labels[group] = [];
    items.forEach(function (value) {
      const item = {
        id: value,
        label: getText(`${scope ? scope + '_' : ''}${value}`)
      };
      if (shortScope) {
        item.shortLabel = getText(`${shortScope}_${value}`);
      }
      labels[group].push(item);
    });
  }
  return labels;
}

async function showContributePage(action = '') {
  await storage.set({contribPageLastOpen: new Date().getTime()}, 'sync');
  const activeTab = await getActiveTab();
  let url = browser.extension.getURL('/src/contribute/index.html');
  if (action) {
    url = `${url}?action=${action}`;
  }
  return createTab(url, {index: activeTab.index + 1});
}

async function showProjectPage() {
  const activeTab = await getActiveTab();
  await createTab(projectUrl, {index: activeTab.index + 1});
}

function validateUrl(url) {
  try {
    if (url.length > 2048) {
      return;
    }

    const parsedUrl = new URL(url);

    if (/^https?:$/i.test(parsedUrl.protocol)) {
      return true;
    }
  } catch (err) {}
}

function normalizeFilename({filename, ext} = {}) {
  if (!filename) {
    filename = 'image';
  }

  if (ext && !filename.toLowerCase().endsWith(ext)) {
    filename = `${filename}.${ext}`;
  }

  return filename;
}

async function normalizeImage({blob, dataUrl} = {}) {
  let data = blob || dataUrl;
  let type = blob ? data.type : getDataUrlMimeType(data);
  const array = blob ? await blobToArray(data) : dataUrlToArray(data);

  const {mime: realType} = (await fileType.fromBuffer(array)) || {};

  if (realType) {
    if (!realType.startsWith('image/')) {
      return {};
    }
    if (type !== realType) {
      type = realType;
      data = new Blob([array], {type});
    }
  } else if (!type || !type.startsWith('image/')) {
    return {};
  }

  if (data instanceof Blob) {
    data = await blobToDataUrl(data);
  }

  const ext = imageMimeTypes[type];

  return {dataUrl: data, type, ext};
}

function getImageElement(url, {query = true} = {}) {
  return new Promise(resolve => {
    let img;
    if (query) {
      img = document.querySelector(`img[src="${url}"]`);
      if (img && img.complete && img.naturalWidth) {
        resolve(img);
      }
    }
    img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      resolve();
    };
    img.onabort = () => {
      resolve();
    };
    img.src = url;
  });
}

async function captureVisibleTabArea(area) {
  const tabData = await browser.tabs.captureVisibleTab({format: 'png'});
  const img = await getImageElement(tabData, {query: false});

  const {left, top, width, height, surfaceWidth, surfaceHeight} = area;
  const scaleX = img.naturalWidth / surfaceWidth;
  const scaleY = img.naturalHeight / surfaceHeight;

  const cnv = document.createElement('canvas');
  const ctx = cnv.getContext('2d');
  cnv.width = width * scaleX;
  cnv.height = height * scaleY;

  ctx.drawImage(
    img,
    left * scaleX,
    top * scaleY,
    cnv.width,
    cnv.height,
    0,
    0,
    cnv.width,
    cnv.height
  );

  return canvasToDataUrl(cnv, {ctx});
}

async function configTheme() {
  if (targetEnv === 'firefox' && (await isAndroid())) {
    document.documentElement.classList.add('firefox-android');
  }
}

function getLargeImageMessage(engine, maxSize) {
  return browser.i18n.getMessage('error_invalidImageSize', [
    browser.i18n.getMessage(`engineName_${engine}`),
    browser.i18n.getMessage('unit_mb', (maxSize / 1024 / 1024).toString())
  ]);
}

function getMaxImageSize(engine) {
  let maxSize;
  if (['google', 'auDesign', 'nzTrademark', 'stocksy'].includes(engine)) {
    maxSize = 20;
  } else if (
    ['tineye', 'baidu', 'sogou', 'depositphotos', 'mailru'].includes(engine)
  ) {
    maxSize = 10;
  } else if (['karmaDecay'].includes(engine)) {
    maxSize = 9;
  } else if (['yandex', 'iqdb', 'auTrademark'].includes(engine)) {
    maxSize = 8;
  } else if (
    [
      'ascii2d',
      'getty',
      'istock',
      'taobao',
      'alamy',
      '123rf',
      'jpDesign',
      'pixta',
      'shutterstock',
      'saucenao'
    ].includes(engine)
  ) {
    maxSize = 5;
  } else if (['jingdong'].includes(engine)) {
    maxSize = 4;
  } else if (
    [
      'qihoo',
      'alibabaChina',
      'esearch',
      'tmview',
      'branddb',
      'madridMonitor'
    ].includes(engine)
  ) {
    maxSize = 2;
  }

  if (maxSize) {
    return maxSize * 1024 * 1024;
  } else {
    return Infinity;
  }
}

async function hasBaseModule(tabId, frameId = 0) {
  try {
    const [isBaseModule] = await browser.tabs.executeScript(tabId, {
      frameId,
      runAt: 'document_start',
      code: `typeof touchTarget !== 'undefined'`
    });

    if (isBaseModule) {
      return true;
    }
  } catch (err) {}
}

export {
  getEnabledEngines,
  getSupportedEngines,
  getSearches,
  isUploadSearch,
  hasUrlSupport,
  showNotification,
  getListItems,
  showContributePage,
  showProjectPage,
  validateUrl,
  normalizeFilename,
  normalizeImage,
  getImageElement,
  captureVisibleTabArea,
  configTheme,
  getLargeImageMessage,
  getMaxImageSize,
  hasBaseModule
};
