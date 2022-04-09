import browser from 'webextension-polyfill';
import {difference} from 'lodash-es';
import fileType from 'file-type';

import storage from 'storage/storage';
import {
  getText,
  createTab,
  getActiveTab,
  getDataUrlMimeType,
  getDataFromUrl,
  dataUrlToArray,
  dataUrlToBlob,
  blobToArray,
  blobToDataUrl,
  canvasToDataUrl,
  canvasToBlob,
  getPlatform,
  shareFiles,
  isAndroid
} from 'utils/common';
import {targetEnv} from 'utils/config';
import {
  optionKeys,
  engines,
  censoredEngines,
  rasterEngineIcons,
  engineIconAlias,
  imageMimeTypes,
  webpEngineSupport,
  avifEngineSupport,
  projectUrl
} from 'utils/data';

async function getEnabledEngines(options) {
  if (typeof options === 'undefined') {
    options = await storage.get(['engines', 'disabledEngines']);
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
    const isAltImage = !imageTypeSupport(image.imageType, engine);
    const method = (await isUploadSearch(image, engine, searchMode, isAltImage))
      ? 'upload'
      : 'url';
    const isExec = engines[engine][method].isExec;
    const isTaskId = engines[engine][method].isTaskId;
    searches.push({
      engine,
      method,
      isExec,
      isTaskId,
      isAltImage,
      sendsReceipt: isExec || isTaskId
    });
  }

  return searches;
}

async function isUploadSearch(image, engine, searchMode, isAltImage) {
  return (
    searchMode === 'selectUpload' ||
    isAltImage ||
    !image.imageUrl ||
    !(await hasUrlSupport(engine, {bypassBlocking: searchMode !== 'url'}))
  );
}

async function hasUrlSupport(engine, {bypassBlocking = true} = {}) {
  let targetEngines;
  if (Array.isArray(engine)) {
    targetEngines = engine;
  } else {
    targetEngines =
      engine === 'allEngines' ? await getEnabledEngines() : [engine];
  }

  const {bypassImageHostBlocking} = await storage.get(
    'bypassImageHostBlocking'
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

async function createSession(data) {
  const session = {
    sessionOrigin: '',
    sessionType: 'search',
    searchMode: '',
    sourceTabId: -1,
    sourceTabIndex: -1,
    sourceFrameId: -1,
    engineGroup: '',
    engines: [],
    options: {}
  };

  session.options = await storage.get(optionKeys);

  if (data.options) {
    Object.assign(session.options, data.options);

    delete data.options;
  }

  if (data.engine) {
    if (data.engine === 'allEngines') {
      const enabledEngines = await getEnabledEngines(session.options);
      session.engineGroup = 'allEngines';
      session.engines = enabledEngines;
    } else {
      session.engines.push(data.engine);
    }

    delete data.engine;
  }

  Object.assign(session, data);

  if (!session.searchMode) {
    session.searchMode =
      session.sessionOrigin === 'action'
        ? session.options.searchModeAction
        : session.options.searchModeContextMenu;
  }

  return session;
}

function showNotification({message, messageId, title, type = 'info'} = {}) {
  if (!title) {
    title = getText('extensionName');
  }
  if (messageId) {
    message = getText(messageId);
  }

  if (targetEnv === 'safari') {
    return browser.runtime.sendNativeMessage('application.id', {
      id: 'notification',
      message
    });
  } else {
    return browser.notifications.create(`sbi-notification-${type}`, {
      type: 'basic',
      title,
      message,
      iconUrl: '/src/assets/icons/app/icon-64.png'
    });
  }
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
  await storage.set({contribPageLastOpen: Date.now()});
  const activeTab = await getActiveTab();
  let url = browser.runtime.getURL('/src/contribute/index.html');
  if (action) {
    url = `${url}?action=${action}`;
  }
  return createTab({url, index: activeTab.index + 1});
}

async function showProjectPage() {
  const activeTab = await getActiveTab();
  await createTab({url: projectUrl, index: activeTab.index + 1});
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

  if (ext) {
    const currentExt = filename.split('.').pop().toLowerCase();
    if (currentExt !== ext) {
      if (isImageFileExt(currentExt)) {
        filename = filename.replace(new RegExp(`${currentExt}$`), ext);
      } else {
        filename = `${filename}.${ext}`;
      }
    }
  }

  return filename;
}

async function normalizeImage({blob, dataUrl} = {}) {
  let data = blob || dataUrl;
  let type = blob ? data.type : getDataUrlMimeType(data);
  const array = blob ? await blobToArray(data) : dataUrlToArray(data);

  const {mime: realType} = (await fileType.fromBuffer(array)) || {};

  if (realType) {
    if (!isImageMimeType(realType)) {
      return {};
    }
    if (type !== realType) {
      type = realType;
      data = new Blob([array], {type});
    }
  } else if (!type || !isImageMimeType(type)) {
    return {};
  }

  if (data instanceof Blob) {
    data = await blobToDataUrl(data);
  }

  const ext = mimeTypeToFileExt(type);

  let image = {dataUrl: data, type, ext};

  return image;
}

async function convertImage(dataUrl) {
  const img = await getImageElement(dataUrl, {query: false});

  const cnv = document.createElement('canvas');
  const ctx = cnv.getContext('2d');

  cnv.width = img.naturalWidth;
  cnv.height = img.naturalHeight;

  ctx.drawImage(img, 0, 0);

  const type = 'image/png';
  const data = canvasToDataUrl(cnv, {ctx, type});
  const ext = mimeTypeToFileExt(type);

  return {dataUrl: data, type, ext};
}

async function convertProcessedImage(image, {throwError = false} = {}) {
  try {
    const {dataUrl, type, ext} = await convertImage(image.imageDataUrl);
    const filename = normalizeFilename({filename: image.imageFilename, ext});
    const imageSize = dataUrlToBlob(dataUrl).size;

    const convImage = {
      imageDataUrl: dataUrl,
      imageFilename: filename,
      imageType: type,
      imageExt: ext,
      imageSize
    };

    return convImage;
  } catch (err) {
    console.log(err.toString());

    if (throwError) {
      throw err;
    }
  }
}

async function resizeImage({blob, dataUrl, type, maxSize = 1000} = {}) {
  if (!type) {
    type = blob ? blob.type : getDataUrlMimeType(dataUrl);
  }

  const url = blob ? URL.createObjectURL(blob) : dataUrl;
  const img = await getImageElement(url, {query: false});
  if (blob) {
    URL.revokeObjectURL(url);
  }

  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  let dw;
  let dh;

  if (sw > maxSize || sh > maxSize) {
    if (sw === sh) {
      dw = dh = maxSize;
    }
    if (sw > sh) {
      dw = maxSize;
      dh = (sh / sw) * maxSize;
    }
    if (sw < sh) {
      dw = (sw / sh) * maxSize;
      dh = maxSize;
    }

    const cnv = document.createElement('canvas');
    const ctx = cnv.getContext('2d');

    cnv.width = dw;
    cnv.height = dh;

    if (type === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, dw, dh);
    }

    ctx.drawImage(img, 0, 0, sw, sh, 0, 0, dw, dh);

    if (blob) {
      blob = await canvasToBlob(cnv, {ctx, type});
      type = blob.type;
    } else {
      dataUrl = canvasToDataUrl(cnv, {ctx, type});
      type = getDataUrlMimeType(dataUrl);
    }
  }

  return {imageBlob: blob, imageDataUrl: dataUrl, imageType: type};
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

  const {left, top, width, height, surfaceWidth} = area;
  const scale = img.naturalWidth / surfaceWidth;

  const cnv = document.createElement('canvas');
  const ctx = cnv.getContext('2d');
  cnv.width = width * scale;
  cnv.height = height * scale;

  ctx.drawImage(
    img,
    left * scale,
    top * scale,
    cnv.width,
    cnv.height,
    0,
    0,
    cnv.width,
    cnv.height
  );

  return canvasToDataUrl(cnv, {ctx});
}

function fileExtToMimeType(fileExt) {
  for (const [type, ext] of Object.entries(imageMimeTypes)) {
    if (ext.includes(fileExt)) {
      return type;
    }
  }

  return null;
}

function mimeTypeToFileExt(mimeType) {
  const ext = imageMimeTypes[mimeType];
  if (ext) {
    return ext[0];
  }

  return null;
}

function isImageMimeType(mimeType) {
  if (imageMimeTypes.hasOwnProperty(mimeType)) {
    return true;
  }

  return false;
}

function isImageFileExt(ext) {
  if (fileExtToMimeType(ext)) {
    return true;
  }

  return false;
}

function getDataFromImageUrl(url) {
  const {filename, ext} = getDataFromUrl(url);
  const type = fileExtToMimeType(ext);

  return {filename, ext, type};
}

async function configUI(Vue) {
  const platform = await getPlatform();

  document.documentElement.classList.add(platform.targetEnv, platform.os);

  if (Vue) {
    Vue.prototype.$env = platform;
  }
}

function getContentXHR() {
  try {
    // Firefox
    return new content.XMLHttpRequest();
  } catch (err) {
    // Chrome
    return new XMLHttpRequest();
  }
}

function fetchImage(url, {credentials = false, token = ''} = {}) {
  return new Promise(resolve => {
    const xhr = getContentXHR();

    xhr.open('GET', url);
    xhr.timeout = 1200000; // 2 minutes
    xhr.responseType = 'blob';
    xhr.withCredentials = credentials;

    if (token) {
      xhr.setRequestHeader('Accept', token);
    }

    xhr.onload = () => {
      resolve(xhr.response);
    };
    xhr.onerror = () => {
      resolve();
    };
    xhr.onabort = () => {
      resolve();
    };
    xhr.ontimeout = () => {
      resolve();
    };

    xhr.send();
  });
}

async function fetchImageFromBackgroundScript(url) {
  const imageDataUrl = await browser.runtime.sendMessage({
    id: 'fetchImage',
    url
  });

  if (imageDataUrl) {
    return dataUrlToBlob(imageDataUrl);
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
      code: `typeof baseModule !== 'undefined'`
    });

    if (isBaseModule) {
      return true;
    }
  } catch (err) {}
}

async function insertBaseModule({activeTab = false} = {}) {
  const tabs = [];
  if (activeTab) {
    const tab = await getActiveTab();
    if (tab) {
      tabs.push(tab);
    }
  } else {
    tabs.push(
      ...(await browser.tabs.query({
        url: ['http://*/*', 'https://*/*'],
        windowType: 'normal'
      }))
    );
  }

  for (const tab of tabs) {
    browser.tabs.executeScript(tab.id, {
      allFrames: true,
      runAt: 'document_start',
      file: '/src/insert/script.js'
    });
  }
}

async function isContextMenuSupported() {
  if (await isAndroid()) {
    if (targetEnv === 'samsung') {
      return true;
    }
  } else if (browser.contextMenus) {
    return true;
  }

  return false;
}

async function checkSearchEngineAccess() {
  // Check if search engine access is enabled in Opera
  if (/ opr\//i.test(navigator.userAgent)) {
    const {lastEngineAccessCheck} = await storage.get('lastEngineAccessCheck');
    // run at most once a week
    if (Date.now() - lastEngineAccessCheck > 604800000) {
      await storage.set({lastEngineAccessCheck: Date.now()});

      const url = 'https://www.google.com/generate_204';

      const hasAccess = await new Promise(resolve => {
        let access = false;

        function requestCallback() {
          access = true;
          removeCallback();
          return {cancel: true};
        }

        const removeCallback = function () {
          window.clearTimeout(timeoutId);
          browser.webRequest.onBeforeRequest.removeListener(requestCallback);

          resolve(access);
        };
        const timeoutId = window.setTimeout(removeCallback, 3000); // 3 seconds

        browser.webRequest.onBeforeRequest.addListener(
          requestCallback,
          {urls: [url], types: ['xmlhttprequest']},
          ['blocking']
        );

        fetch(url).catch(err => null);
      });

      if (!hasAccess) {
        await showNotification({messageId: 'error_noSearchEngineAccess'});
      }
    }
  }
}

async function getFilesFromClipboard({focusNode = null} = {}) {
  return new Promise(resolve => {
    const onPaste = function (ev) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      removeCallbacks();

      const files = Array.prototype.slice.call(ev.clipboardData.files, 0, 3);

      resolve(files.length ? files : null);
    };

    const removeCallbacks = function () {
      window.clearTimeout(timeoutId);
      window.removeEventListener('paste', onPaste, {
        capture: true,
        passive: false,
        once: true
      });
    };

    const onTimeout = function () {
      removeCallbacks();
      resolve(null);
    };

    const timeoutId = window.setTimeout(onTimeout, 1000); // 1 second

    window.addEventListener('paste', onPaste, {
      capture: true,
      passive: false,
      once: true
    });

    if (focusNode) {
      focusNode.focus();
    }

    document.execCommand('paste');
  });
}

function getImagesFromFiles(files) {
  const images = files.filter(file => isImageMimeType(file.type));
  if (images.length) {
    return images;
  }
}

async function getImagesFromClipboard() {
  const files = await getFilesFromClipboard();

  if (files) {
    return getImagesFromFiles(files);
  }
}

function getEngineIcon(engine) {
  const name = engineIconAlias[engine] || engine;
  const ext = rasterEngineIcons.includes(name) ? 'png' : 'svg';

  return `/src/assets/icons/engines/${name}.${ext}`;
}

function getEngineMenuIcon(engine) {
  const name = engineIconAlias[engine] || engine;

  if (rasterEngineIcons.includes(name)) {
    return {
      16: `src/assets/icons/engines/${name}-16.png`,
      32: `src/assets/icons/engines/${name}-32.png`
    };
  } else {
    return {
      16: `src/assets/icons/engines/${name}.svg`
    };
  }
}

async function shareImage(image, {convert = false} = {}) {
  if (convert && ['image/webp', 'image/avif'].includes(image.imageType)) {
    const convImage = await convertProcessedImage(image);
    if (convImage) {
      image = convImage;
    }
  }

  const files = [
    new File([dataUrlToBlob(image.imageDataUrl)], image.imageFilename, {
      type: image.imageType
    })
  ];

  try {
    await shareFiles(files);
  } catch (err) {
    console.log(err.toString());

    await browser.runtime.sendMessage({
      id: 'notification',
      messageId: 'error_imageShareNotSupported'
    });
  }
}

function imageTypeSupport(type, engine) {
  if (type === 'image/webp') {
    if (webpEngineSupport.includes(engine)) {
      return true;
    }
  } else if (type === 'image/avif') {
    if (avifEngineSupport.includes(engine)) {
      return true;
    }
  } else {
    return true;
  }
}

export {
  getEnabledEngines,
  getSupportedEngines,
  getSearches,
  isUploadSearch,
  hasUrlSupport,
  createSession,
  showNotification,
  getListItems,
  showContributePage,
  showProjectPage,
  validateUrl,
  normalizeFilename,
  normalizeImage,
  resizeImage,
  convertImage,
  convertProcessedImage,
  getImageElement,
  captureVisibleTabArea,
  getContentXHR,
  fetchImage,
  fetchImageFromBackgroundScript,
  fileExtToMimeType,
  mimeTypeToFileExt,
  isImageMimeType,
  isImageFileExt,
  getDataFromImageUrl,
  configUI,
  getLargeImageMessage,
  getMaxImageSize,
  hasBaseModule,
  insertBaseModule,
  isContextMenuSupported,
  checkSearchEngineAccess,
  getFilesFromClipboard,
  getImagesFromClipboard,
  getImagesFromFiles,
  getEngineIcon,
  getEngineMenuIcon,
  shareImage,
  imageTypeSupport
};
