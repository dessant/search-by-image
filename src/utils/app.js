import {difference} from 'lodash-es';
import {fileTypeFromBuffer} from 'file-type';
import {validate as uuidValidate} from 'uuid';
import {parseSrcset} from 'srcset';
import filesize from 'filesize';

import storage from 'storage/storage';
import {
  getText,
  createTab,
  getActiveTab,
  getDataUrlMimeType,
  getDataFromUrl,
  filenameToFileExt,
  dataUrlToBlob,
  drawElementOnCanvas,
  blobToArray,
  blobToDataUrl,
  canvasToDataUrl,
  canvasToBlob,
  executeCode,
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
  imageTypeNames,
  convertImageMimeTypes,
  webpEngineSupport,
  avifEngineSupport,
  maxImageUploadSize,
  supportUrl,
  shareBridgeUrl
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
    const assetType = (await isUploadSearch(
      image,
      engine,
      searchMode,
      isAltImage
    ))
      ? 'image'
      : 'url';
    const isExec = engines[engine][assetType].isExec;
    const isTaskId = engines[engine][assetType].isTaskId;
    searches.push({
      engine,
      assetType,
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
    ['selectImage', 'capture', 'browse'].includes(searchMode) ||
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
    sessionType: '',

    sourceTabId: -1,
    sourceTabIndex: -1,
    sourceFrameId: -1,
    closeSourceTab: false,

    searchMode: '',
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

  if (session.sessionType === 'search' && !session.searchMode) {
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

async function showSupportPage() {
  const activeTab = await getActiveTab();
  await createTab({url: supportUrl, index: activeTab.index + 1});
}

function validateUrl(url, {allowDataUrl = false} = {}) {
  try {
    if (allowDataUrl && url.startsWith('data:')) {
      return true;
    }

    if (url.length <= 2048 && /^https?:$/i.test(new URL(url).protocol)) {
      return true;
    }
  } catch (err) {}
}

function normalizeImageFilename({name, type} = {}) {
  if (!name) {
    name = 'image';
  }

  if (type) {
    const newExt = imageMimeTypeToFileExt(type);

    if (newExt) {
      const currentExt = filenameToFileExt(name);

      if (currentExt) {
        const currentType = imageFileExtToMimeType(currentExt);

        if (currentType !== type) {
          name = name.replace(new RegExp(`${currentExt}$`, 'i'), newExt);
        }
      } else {
        name = `${name}.${newExt}`;
      }
    }
  }

  return name;
}

function normalizeImageFileAttributes(file, {name, type} = {}) {
  const filetype = type || file.type;
  const filename = normalizeImageFilename({
    name: name || file.name,
    type: filetype
  });

  if (file.name !== filename || file.type !== filetype) {
    return new File([file], filename, {type: filetype});
  }

  return file;
}

async function dataToImage({blob, dataUrl, name} = {}) {
  if (!blob) {
    blob = dataUrlToBlob(dataUrl);
  }

  const image = await normalizeImage(blob, {name});
  if (image) {
    return image;
  }
}

async function fileUrlToImage(url) {
  const cnv = document.createElement('canvas');
  const ctx = cnv.getContext('2d');

  const img = await getImageElement({url, query: true});
  if (img) {
    let {name, type} = getDataFromImageUrl(url);
    if (!['image/jpeg', 'image/png'].includes(type)) {
      type = 'image/png';
    }

    cnv.width = img.naturalWidth;
    cnv.height = img.naturalHeight;

    if (drawElementOnCanvas(ctx, img)) {
      const blob = await canvasToBlob(cnv, {ctx, type});

      if (isFileAccepted(blob)) {
        return normalizeImageFileAttributes(blob, {name});
      }
    }
  }
}

async function blobUrlToImage(url) {
  const cnv = document.createElement('canvas');
  const ctx = cnv.getContext('2d');

  const img = await getImageElement({url, query: true});
  if (img) {
    cnv.width = img.naturalWidth;
    cnv.height = img.naturalHeight;

    if (drawElementOnCanvas(ctx, img)) {
      const blob = await canvasToBlob(cnv, {ctx});

      if (isFileAccepted(blob)) {
        return normalizeImageFileAttributes(blob);
      }
    }
  }
}

async function normalizeImage(file, {name} = {}) {
  if (!isFileAccepted(file)) {
    return;
  }

  const chunk = await blobToArray(file.slice(0, 4100));
  const {mime: realType} = (await fileTypeFromBuffer(chunk)) || {};

  if (realType) {
    if (isImageMimeType(realType)) {
      return normalizeImageFileAttributes(file, {type: realType, name});
    }
  } else if (isImageMimeType(file.type)) {
    return normalizeImageFileAttributes(file, {name});
  }
}

async function normalizeImages(files) {
  if (files) {
    const images = [];

    for (const file of files) {
      const image = await normalizeImage(file);

      if (image) {
        images.push(image);
      }
    }

    if (images.length) {
      return images;
    }
  }
}

async function processImage(file) {
  const dataUrl = await blobToDataUrl(file);

  if (dataUrl) {
    return {
      imageDataUrl: dataUrl,
      imageFilename: file.name,
      imageType: file.type,
      imageSize: file.size
    };
  }
}

async function processImages(files) {
  if (files) {
    const images = [];

    for (const file of files) {
      const image = await processImage(file);

      if (image) {
        images.push(image);
      }
    }

    if (images.length) {
      return images;
    }
  }
}

function getMaxImageDimension({maxSize = Infinity} = {}) {
  if (!maxSize || maxSize === Infinity) {
    return Infinity;
  } else if (maxSize >= 8 * 1024 * 1024) {
    return 1600;
  } else if (maxSize >= 4 * 1024 * 1024) {
    return 1200;
  } else {
    return 800;
  }
}

function limitImageDimensions(sw, sh, {maxDimension = Infinity} = {}) {
  let dw;
  let dh;

  if (sw > maxDimension || sh > maxDimension) {
    if (sw === sh) {
      dw = dh = maxDimension;
    }
    if (sw > sh) {
      dw = maxDimension;
      dh = (sh / sw) * maxDimension;
    }
    if (sw < sh) {
      dw = (sw / sh) * maxDimension;
      dh = maxDimension;
    }
  } else {
    dw = sw;
    dh = sh;
  }

  return {width: dw, height: dh};
}

async function convertImage({
  blob,
  dataUrl,
  currentType = '',
  currentSize = 0,
  newType = '',
  maxSize = Infinity,
  maxDimension = Infinity,
  getBlob = false
} = {}) {
  if (maxSize !== Infinity) {
    if (!currentSize) {
      if (!blob) {
        blob = dataUrlToBlob(dataUrl);
      }
      currentSize = blob.size;
    }

    if (maxDimension === Infinity) {
      maxDimension = getMaxImageDimension({maxSize});
    }
  }

  if (!currentType) {
    currentType = blob?.type || getDataUrlMimeType(dataUrl);
  }
  if (!newType) {
    newType = currentType;
  }

  const img = await getImageElement({url: dataUrl, blob});

  let currentWidth = img.naturalWidth;
  let currentHeight = img.naturalHeight;

  while (
    currentType !== newType ||
    currentSize > maxSize ||
    currentWidth > maxDimension ||
    currentHeight > maxDimension
  ) {
    const {width: newWidth, height: newHeight} = limitImageDimensions(
      currentWidth,
      currentHeight,
      {maxDimension}
    );

    const cnv = document.createElement('canvas');
    const ctx = cnv.getContext('2d');

    cnv.width = newWidth;
    cnv.height = newHeight;

    if (newType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, newWidth, newHeight);
    }

    ctx.drawImage(
      img,
      0,
      0,
      currentWidth,
      currentHeight,
      0,
      0,
      newWidth,
      newHeight
    );

    if (getBlob || maxSize < Infinity) {
      blob = await canvasToBlob(cnv, {ctx, type: newType, clear: false});
    }

    if (maxSize !== Infinity) {
      currentSize = blob.size;

      if (currentSize > maxSize && maxDimension > 600) {
        maxDimension -= 200;
        continue;
      }
    }

    return getBlob ? blob : canvasToDataUrl(cnv, {ctx, type: newType});
  }

  if (getBlob && !blob) {
    blob = dataUrlToBlob(dataUrl);
  }

  return getBlob ? blob : dataUrl;
}

async function convertProcessedImage(
  image,
  {
    newType = '',
    maxSize = Infinity,
    maxDimension = Infinity,
    getFile = false,
    setBlob = false,
    throwError = false
  } = {}
) {
  try {
    const blob = await convertImage({
      dataUrl: image.imageDataUrl,
      currentType: image.imageType,
      currentSize: image.imageSize,
      newType,
      maxSize,
      maxDimension,
      getBlob: true
    });
    if (blob) {
      const file = normalizeImageFileAttributes(blob, {
        name: image.imageFilename
      });
      if (getFile) {
        return file;
      }

      const convImage = await processImage(file);
      if (setBlob) {
        convImage.imageBlob = blob;
      }

      return convImage;
    }
  } catch (err) {
    console.log(err.toString());

    if (throwError) {
      throw err;
    }
  }
}

function getImageElement({url, blob, query = false} = {}) {
  return new Promise(resolve => {
    if (query) {
      const images = document.images;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img?.currentSrc === url) {
          if (img.complete && img.naturalWidth) {
            resolve(img);
          } else {
            break;
          }
        }
      }
    }

    // Firefox only supports data URLs of up to 32 MiB
    if (
      targetEnv === 'firefox' &&
      url &&
      url.startsWith('data:') &&
      url.length > 32 * 1024 * 1024
    ) {
      try {
        blob = dataUrlToBlob(url);
      } catch {}
    }

    if (blob) {
      url = URL.createObjectURL(blob);
    }

    function load(img) {
      if (blob) {
        URL.revokeObjectURL(url);
      }

      if (img) {
        resolve(img);
      } else {
        resolve();
      }
    }

    const img = new Image();

    img.onload = () => {
      load(img);
    };
    img.onerror = () => {
      load();
    };
    img.onabort = () => {
      load();
    };

    img.src = url;
  });
}

async function captureVisibleTabArea(area) {
  const tabData = await browser.tabs.captureVisibleTab({format: 'png'});
  const img = await getImageElement({url: tabData});

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

  return canvasToBlob(cnv, {ctx});
}

async function captureImage(area, tabId) {
  const [surfaceWidth] = await executeCode(`window.innerWidth;`, tabId);
  area = {...area, surfaceWidth};

  const blob = await captureVisibleTabArea(area);
  const file = normalizeImageFileAttributes(blob);

  return processImage(file);
}

function imageFileExtToMimeType(fileExt) {
  for (const [type, ext] of Object.entries(imageMimeTypes)) {
    if (ext.includes(fileExt)) {
      return type;
    }
  }

  return null;
}

function imageMimeTypeToFileExt(mimeType) {
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
  if (imageFileExtToMimeType(ext)) {
    return true;
  }

  return false;
}

function getDataFromImageUrl(url) {
  const {name, ext} = getDataFromUrl(url);
  const type = imageFileExtToMimeType(ext);

  return {name, ext, type};
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

function getMaxImageUploadSize(engine, {target} = {}) {
  const data = maxImageUploadSize[engine];

  if (target) {
    return data[target];
  } else if (!data.api || !data.ui) {
    return data.api || data.ui;
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

async function getImagesFromClipboard() {
  const files = await getFilesFromClipboard();

  if (files) {
    return normalizeImages(files);
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
  let convFile;
  if (convert && convertImageMimeTypes.includes(image.imageType)) {
    convFile = await convertProcessedImage(image, {
      newType: 'image/png',
      getFile: true
    });
  }

  const files = [
    convFile ||
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

async function isFileAccepted(file) {
  // Ignore files larger than 300 MB
  if (file) {
    if (file.size <= 300 * 1024 * 1024) {
      return true;
    } else {
      console.log(`File too large (${file.size} bytes)`);
    }
  }

  return false;
}

async function sendBackgroundMessage(message) {
  // Used when the message may be sent on browser start, before the background
  // page event listener has been initialized. Response must not be falsy.
  return new Promise((resolve, reject) => {
    let stop;

    const sendMessage = async function () {
      const data = await browser.runtime.sendMessage(message);
      if (data) {
        window.clearTimeout(timeoutId);
        resolve(data);
      } else if (stop) {
        reject(new Error('Background page is not ready'));
      } else {
        window.setTimeout(sendMessage, 30);
      }
    };

    const timeoutId = window.setTimeout(function () {
      stop = true;
    }, 60000); // 1 minute

    sendMessage();
  });
}

function canShare(env) {
  if (
    navigator.canShare &&
    (env.isSafari || ((env.isWindows || env.isAndroid) && !env.isFirefox))
  ) {
    return true;
  }

  return false;
}

function validateId(id) {
  return uuidValidate(id);
}

async function validateShareId(shareId, {validateData = false} = {}) {
  if (!shareId?.split('_').every(item => validateId(item))) {
    return false;
  }

  if (validateData) {
    const data = await sendBackgroundMessage({
      id: 'sendNativeMessage',
      message: {id: 'validateShareId', shareId}
    });

    return data.response?.isValid;
  }

  return true;
}

function isIncomingShareContext() {
  if (
    targetEnv === 'safari' &&
    window.location.href.startsWith(shareBridgeUrl)
  ) {
    return true;
  }

  return false;
}

async function processIncomingShare() {
  const shareId = window.location.hash.substring(1);

  if (await validateShareId(shareId, {validateData: true})) {
    const tabUrl = `${browser.runtime.getURL(
      '/src/browse/index.html'
    )}?id=${shareId}&origin=share`;

    window.location.replace(tabUrl);
  }
}

function getSrcsetUrls(srcset) {
  const urls = [];

  try {
    const data = parseSrcset(srcset, {strict: false});
    for (const item of data) {
      urls.push(item.url);
    }
  } catch (err) {}

  return urls;
}

async function configApp(app) {
  const platform = await getPlatform();

  document.documentElement.classList.add(platform.targetEnv, platform.os);

  if (app) {
    app.config.globalProperties.$env = platform;
  }
}

async function loadFonts(fonts) {
  for (const font of fonts) {
    try {
      await document.fonts.load(font);
    } catch (err) {}
  }
}

function getFormattedImageDetails({
  width,
  height,
  size,
  type,
  iecSize = true
} = {}) {
  const details = [];

  if (width) {
    const text = getFormattedImageDimension(width, height);
    details.push({kind: 'dimension', text});
  }

  if (size) {
    const text = getFormattedImageSize(size, {iec: iecSize});
    details.push({kind: 'size', text});
  }

  if (type) {
    const text = getFormattedImageType(type);
    details.push({kind: 'type', text});
  }

  return details;
}

function getFormattedImageDimension(width, height) {
  return `${width} × ${height} px`;
}

function getFormattedImageSize(size, {iec = true} = {}) {
  return filesize(size, {round: 2, base: iec ? 10 : 2});
}

function getFormattedImageType(type) {
  return imageTypeNames[type] || type;
}

function isPreviewImageValid(node) {
  return /^(?:data|https?):/i.test(node.currentSrc.slice(0, 6));
}

function getExtensionUrlPattern() {
  try {
    const {protocol} = new URL(
      browser.runtime.getURL('/src/background/index.html')
    );

    return `${protocol}//*/*`;
  } catch (err) {}

  return null;
}

function getImageUrlFromContextMenuEvent(ev) {
  if (
    ev.mediaType === 'image' &&
    validateUrl(ev.srcUrl, {allowDataUrl: true})
  ) {
    return ev.srcUrl;
  }
}

async function processImageUrl(url, {session, mustDownloadUrl = false} = {}) {
  let processedImage;

  if (url.startsWith('data:')) {
    const file = await dataToImage({dataUrl: url});

    if (file) {
      const image = await processImage(file);

      if (image) {
        processedImage = image;
      }
    }
  } else {
    const {name: filename, type: imageType} = getDataFromImageUrl(url);

    mustDownloadUrl =
      mustDownloadUrl ||
      session.sessionType === 'share' ||
      (session.sessionType === 'view' && session.options.viewImageUseViewer) ||
      (session.sessionType === 'search' &&
        (session.searchMode === 'selectImage' ||
          !(await hasUrlSupport(session.engines)) ||
          session.engines.some(
            engine => !imageTypeSupport(imageType, engine)
          )));

    if (mustDownloadUrl) {
      const blob = await fetchImage(url);

      if (blob) {
        const file = await dataToImage({blob, name: filename});

        if (file) {
          const image = await processImage(file);

          if (image) {
            processedImage = {imageUrl: url, ...image};
          }
        }
      }
    } else {
      processedImage = {imageUrl: url, imageType};
    }
  }

  return processedImage;
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
  showSupportPage,
  validateUrl,
  normalizeImageFilename,
  normalizeImageFileAttributes,
  dataToImage,
  fileUrlToImage,
  blobUrlToImage,
  normalizeImage,
  normalizeImages,
  processImage,
  processImages,
  convertImage,
  convertProcessedImage,
  getImageElement,
  getMaxImageDimension,
  limitImageDimensions,
  captureVisibleTabArea,
  captureImage,
  getContentXHR,
  fetchImage,
  fetchImageFromBackgroundScript,
  imageFileExtToMimeType,
  imageMimeTypeToFileExt,
  isImageMimeType,
  isImageFileExt,
  getDataFromImageUrl,
  configApp,
  getLargeImageMessage,
  getMaxImageUploadSize,
  hasBaseModule,
  insertBaseModule,
  isContextMenuSupported,
  checkSearchEngineAccess,
  getFilesFromClipboard,
  getImagesFromClipboard,
  getEngineIcon,
  getEngineMenuIcon,
  shareImage,
  imageTypeSupport,
  isFileAccepted,
  sendBackgroundMessage,
  canShare,
  validateId,
  validateShareId,
  isIncomingShareContext,
  processIncomingShare,
  getSrcsetUrls,
  loadFonts,
  getFormattedImageDetails,
  getFormattedImageDimension,
  getFormattedImageSize,
  getFormattedImageType,
  isPreviewImageValid,
  getExtensionUrlPattern,
  getImageUrlFromContextMenuEvent,
  processImageUrl
};
