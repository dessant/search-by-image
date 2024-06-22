import {difference} from 'lodash-es';
import {fileTypeFromBuffer} from 'file-type';
import {v4 as uuidv4, validate as uuidValidate} from 'uuid';
import {parseSrcset} from 'srcset';
import {filesize} from 'filesize';

import storage from 'storage/storage';
import {
  getText,
  executeScript,
  createTab,
  getActiveTab,
  getDataUrlMimeType,
  getDataFromUrl,
  filenameToFileExt,
  dataUrlToBlob,
  drawElementOnCanvas,
  blobToArray,
  blobToDataUrl,
  splitAsciiString,
  getCanvas,
  canvasToDataUrl,
  canvasToBlob,
  getPlatform,
  shareFiles,
  getDayPrecisionEpoch,
  getExtensionDomain,
  isAndroid,
  getDarkColorSchemeQuery,
  isValidTab,
  getRandomInt
} from 'utils/common';
import {
  targetEnv,
  enableContributions,
  storageRevisions,
  appVersion,
  mv3
} from 'utils/config';
import {
  optionKeys,
  engines,
  censoredEngines,
  rasterEngineIcons,
  engineIconAlias,
  engineIconVariants,
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

async function showNotification({
  message,
  messageId,
  title,
  type = 'info',
  timeout = 0
} = {}) {
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
    const notification = await browser.notifications.create(
      `sbi-notification-${type}`,
      {
        type: 'basic',
        title,
        message,
        iconUrl: '/src/assets/icons/app/icon-64.png'
      }
    );

    if (timeout) {
      self.setTimeout(() => {
        browser.notifications.clear(notification);
      }, timeout);
    }

    return notification;
  }
}

function getListItems(data, {scope = '', shortScope = ''} = {}) {
  const results = {};

  for (const [group, items] of Object.entries(data)) {
    results[group] = [];

    items.forEach(function (item) {
      if (item.value === undefined) {
        item = {value: item};
      }

      item.title = getText(`${scope ? scope + '_' : ''}${item.value}`);

      if (shortScope) {
        item.shortTitle = getText(`${shortScope}_${item.value}`);
      }

      results[group].push(item);
    });
  }

  return results;
}

async function hasModule({tabId, frameId = 0, module, insert = false} = {}) {
  try {
    const [isModule] = await executeScript({
      func: module => self.runStore?.[`${module}Module`],
      args: [module],
      code: `self.runStore?.['${module}Module']`,
      tabId,
      frameIds: [frameId]
    });

    if (!isModule && insert) {
      await executeScript({
        files: [`/src/${module}/script.js`],
        tabId,
        frameIds: [frameId]
      });
    }

    if (isModule || insert) {
      return true;
    }
  } catch (err) {
    console.log(err);
  }

  return false;
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
    executeScript({
      files: ['/src/base/script.js'],
      tabId: tab.id,
      allFrames: true
    });
  }
}

async function loadFonts(fonts) {
  await Promise.allSettled(fonts.map(font => document.fonts.load(font)));
}

async function configApp(app) {
  const platform = await getPlatform();

  const classes = [platform.targetEnv, platform.os];
  document.documentElement.classList.add(...classes);

  if (app) {
    app.config.globalProperties.$env = platform;
  }
}

async function getAppTheme(theme) {
  if (!theme) {
    ({appTheme: theme} = await storage.get('appTheme'));
  }

  if (theme === 'auto') {
    theme = getDarkColorSchemeQuery().matches ? 'dark' : 'light';
  }

  return theme;
}

function addSystemThemeListener(callback) {
  getDarkColorSchemeQuery().addEventListener('change', function () {
    callback();
  });
}

function addAppThemeListener(callback) {
  browser.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local' && changes.appTheme) {
      callback();
    }
  });
}

function addThemeListener(callback) {
  addSystemThemeListener(callback);
  addAppThemeListener(callback);
}

async function getOpenerTabId({tab, tabId = null} = {}) {
  if (!tab && tabId !== null) {
    tab = await browser.tabs.get(tabId).catch(err => null);
  }

  if ((await isValidTab({tab})) && !(await getPlatform()).isMobile) {
    return tab.id;
  }

  return null;
}

async function showPage({
  url = '',
  setOpenerTab = true,
  getTab = false,
  activeTab = null
} = {}) {
  if (!activeTab) {
    activeTab = await getActiveTab();
  }

  const props = {url, index: activeTab.index + 1, active: true, getTab};

  if (setOpenerTab) {
    props.openerTabId = await getOpenerTabId({tab: activeTab});
  }

  return createTab(props);
}

async function autoShowContributePage({
  minUseCount = 0, // 0-1000
  minInstallDays = 0,
  minLastOpenDays = 0,
  minLastAutoOpenDays = 0,
  action = 'auto',
  activeTab = null
} = {}) {
  if (enableContributions) {
    const options = await storage.get([
      'showContribPage',
      'useCount',
      'installTime',
      'contribPageLastOpen',
      'contribPageLastAutoOpen'
    ]);

    const epoch = getDayPrecisionEpoch();

    if (
      options.showContribPage &&
      options.useCount >= minUseCount &&
      epoch - options.installTime >= minInstallDays * 86400000 &&
      epoch - options.contribPageLastOpen >= minLastOpenDays * 86400000 &&
      epoch - options.contribPageLastAutoOpen >= minLastAutoOpenDays * 86400000
    ) {
      await storage.set({
        contribPageLastOpen: epoch,
        contribPageLastAutoOpen: epoch
      });

      return showContributePage({
        action,
        updateStats: false,
        activeTab,
        getTab: true
      });
    }
  }
}

let useCountLastUpdate = 0;
async function updateUseCount({
  valueChange = 1,
  maxUseCount = Infinity,
  minInterval = 0
} = {}) {
  if (Date.now() - useCountLastUpdate >= minInterval) {
    useCountLastUpdate = Date.now();

    const {useCount} = await storage.get('useCount');

    if (useCount < maxUseCount) {
      await storage.set({useCount: useCount + valueChange});
    } else if (useCount > maxUseCount) {
      await storage.set({useCount: maxUseCount});
    }
  }
}

async function processAppUse({
  action = 'auto',
  activeTab = null,
  showContribPage = true
} = {}) {
  await updateUseCount({
    valueChange: 1,
    maxUseCount: 1000
  });

  if (showContribPage) {
    return autoShowContributePage({
      minUseCount: 10,
      minInstallDays: 14,
      minLastOpenDays: 14,
      minLastAutoOpenDays: 365,
      activeTab,
      action
    });
  }
}

async function showContributePage({
  action = '',
  updateStats = true,
  getTab = false,
  activeTab = null
} = {}) {
  if (updateStats) {
    await storage.set({contribPageLastOpen: getDayPrecisionEpoch()});
  }

  let url = browser.runtime.getURL('/src/contribute/index.html');
  if (action) {
    url = `${url}?action=${action}`;
  }

  return showPage({url, getTab, activeTab});
}

async function showOptionsPage({getTab = false, activeTab = null} = {}) {
  // Samsung Internet 13: runtime.openOptionsPage fails.
  // runtime.openOptionsPage adds new tab at the end of the tab list.
  return showPage({
    url: browser.runtime.getURL('/src/options/index.html'),
    getTab,
    activeTab
  });
}

async function showSupportPage({getTab = false, activeTab = null} = {}) {
  return showPage({url: supportUrl, getTab, activeTab});
}

async function setAppVersion() {
  await storage.set({appVersion});
}

async function isSessionStartup() {
  const privateContext = browser.extension.inIncognitoContext;

  const sessionKey = privateContext ? 'privateSession' : 'session';
  const session = (await browser.storage.session.get(sessionKey))[sessionKey];

  if (!session) {
    await browser.storage.session.set({[sessionKey]: true});
  }

  if (privateContext) {
    try {
      if (!(await self.caches.has(sessionKey))) {
        await self.caches.open(sessionKey);

        return true;
      }
    } catch (err) {
      return true;
    }
  }

  if (!session) {
    return true;
  }
}

async function isStartup() {
  const startup = {
    install: false,
    update: false,
    session: false,
    setupInstance: false,
    setupSession: false
  };

  const {storageVersion, appVersion: savedAppVersion} =
    await browser.storage.local.get(['storageVersion', 'appVersion']);

  if (!storageVersion) {
    startup.install = true;
  }

  if (
    storageVersion !== storageRevisions.local ||
    savedAppVersion !== appVersion
  ) {
    startup.update = true;
  }

  if (mv3 && (await isSessionStartup())) {
    startup.session = true;
  }

  if (startup.install || startup.update) {
    startup.setupInstance = true;
  }

  if (startup.session || !mv3) {
    startup.setupSession = true;
  }

  return startup;
}

let startupState;
async function getStartupState({event = ''} = {}) {
  if (!startupState) {
    startupState = isStartup();
    startupState.events = [];
  }

  if (event) {
    startupState.events.push(event);
  }

  const startup = await startupState;

  if (startupState.events.includes('install')) {
    startup.setupInstance = true;
  }
  if (startupState.events.includes('startup')) {
    startup.setupSession = true;
  }

  return startup;
}

function getNetRequestRuleIds({count = 1, reserved = false} = {}) {
  const ruleIds = [];

  let minValue, maxValue;
  if (reserved) {
    minValue = 1;
    maxValue = 100_000_000;
  } else {
    minValue = 100_000_001;
    maxValue = ['firefox', 'safari'].includes(targetEnv)
      ? Number.MAX_SAFE_INTEGER
      : 2_147_483_647;
  }

  while (true) {
    const ruleId = getRandomInt(minValue, maxValue);

    if (!ruleIds.includes(ruleId)) {
      ruleIds.push(ruleId);
    }

    if (ruleIds.length === count) {
      break;
    }
  }

  return ruleIds;
}

function getEngineIcon(engine, {variant = ''} = {}) {
  engine = engineIconAlias[engine] || engine;

  let name = engine;
  if (variant && engineIconVariants[engine]?.includes(variant)) {
    name += `-${variant}`;
  }

  const ext = rasterEngineIcons.includes(engine) ? 'png' : 'svg';

  return `/src/assets/icons/engines/${name}.${ext}`;
}

function getEngineMenuIcon(engine, {variant = ''} = {}) {
  engine = engineIconAlias[engine] || engine;

  let name = engine;
  if (variant && engineIconVariants[engine]?.includes(variant)) {
    name += `-${variant}`;
  }

  if (rasterEngineIcons.includes(engine)) {
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

function handleActionEscapeKey() {
  // Keep the browser action open when a menu or popup is active

  // Firefox: extensions cannot handle the Escape key event
  window.addEventListener(
    'keydown',
    ev => {
      if (ev.key === 'Escape' && document.querySelector('.v-overlay--active')) {
        ev.preventDefault();
      }
    },
    {capture: true, passive: false}
  );
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
  if (/ opr\//i.test(navigator.userAgent)) {
    // Check if the "Allow access to search page results" option
    // is enabled in Opera. Host access is needed for redirecting a request
    // with declarativeNetRequest (but not for blocking), so a request is made
    // with manual redirection. If host access has been granted, the request
    // does not reach the server and the response type will be 'opaqueredirect'.

    const {lastEngineAccessCheck} = await storage.get('lastEngineAccessCheck');
    // run at most once a week
    if (Date.now() - lastEngineAccessCheck > 604800000) {
      await storage.set({lastEngineAccessCheck: Date.now()});

      const url = 'https://www.google.com/generate_204';

      let hasAccess = false;

      if (mv3) {
        const ruleIds = getNetRequestRuleIds({reserved: true});

        await browser.declarativeNetRequest.updateSessionRules({
          removeRuleIds: ruleIds,
          addRules: [
            {
              id: ruleIds[0],
              action: {
                type: 'redirect',
                redirect: {
                  transform: {path: ''}
                }
              },
              condition: {
                urlFilter: url,
                initiatorDomains: [getExtensionDomain()],
                resourceTypes: ['xmlhttprequest']
              }
            }
          ]
        });

        const rsp = await fetch(url, {
          redirect: 'manual',
          credentials: 'omit'
        }).catch(err => null);

        if (rsp && rsp.type === 'opaqueredirect') {
          hasAccess = true;
        }

        await browser.declarativeNetRequest.updateSessionRules({
          removeRuleIds: ruleIds
        });
      } else {
        await new Promise(resolve => {
          function requestCallback() {
            hasAccess = true;
            removeCallback();

            return {cancel: true};
          }

          const removeCallback = function () {
            self.clearTimeout(timeoutId);
            browser.webRequest.onBeforeRequest.removeListener(requestCallback);

            resolve();
          };
          const timeoutId = self.setTimeout(removeCallback, 3000); // 3 seconds

          browser.webRequest.onBeforeRequest.addListener(
            requestCallback,
            {urls: [url], types: ['xmlhttprequest']},
            ['blocking']
          );

          fetch(url).catch(err => null);
        });
      }

      if (!hasAccess) {
        await showNotification({messageId: 'error_noSearchEngineAccess'});
      }
    }
  }
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
  const img = await getImageElement({url, query: true});
  if (img) {
    let {name, type} = getDataFromImageUrl(url);
    if (!['image/jpeg', 'image/png'].includes(type)) {
      type = 'image/png';
    }

    const {cnv, ctx} = getCanvas(img.naturalWidth, img.naturalHeight);

    if (drawElementOnCanvas(ctx, img)) {
      const blob = await canvasToBlob(cnv, {ctx, type});

      if (isFileAccepted(blob)) {
        return normalizeImageFileAttributes(blob, {name});
      }
    }
  }
}

async function blobUrlToImage(url) {
  const img = await getImageElement({url, query: true});
  if (img) {
    const {cnv, ctx} = getCanvas(img.naturalWidth, img.naturalHeight);

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

  // ignore unreadable files
  const chunk = await blobToArray(file.slice(0, 4100)).catch(err => null);

  let realType;
  if (chunk) {
    ({mime: realType} = (await fileTypeFromBuffer(chunk)) || {});
  }

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
    return 1680;
  } else if (maxSize >= 4 * 1024 * 1024) {
    return 1280;
  } else {
    return 880;
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

    const {cnv, ctx} = getCanvas(newWidth, newHeight);

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

      if (currentSize > maxSize && maxDimension > 480) {
        maxDimension -= 200;
        continue;
      }
    }

    return getBlob ? blob : await canvasToDataUrl(cnv, {ctx, type: newType});
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

async function getImageElement({url, blob, query = false} = {}) {
  if (typeof Image === 'undefined') {
    if (url) {
      if (!url.startsWith('data:')) {
        throw new Error(
          'getImageElement does not accept image URLs in service workers'
        );
      }

      try {
        blob = dataUrlToBlob(url);
      } catch {}
    }

    let bmp;
    try {
      bmp = await createImageBitmap(blob);
      bmp.naturalWidth = bmp.width;
      bmp.naturalHeight = bmp.height;
    } catch {}

    return bmp;
  } else {
    return new Promise(resolve => {
      if (query) {
        // Only use when the natural size of the image is not needed,
        // an srcset x descriptor can affect naturalWidth and naturalHeight.
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

      // Some browsers do not support large data URLs
      if (url && url.startsWith('data:') && url.length > getMaxDataUrlSize()) {
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
}

async function captureVisibleTabArea(area) {
  const tabData = await browser.tabs.captureVisibleTab({format: 'png'});
  const img = await getImageElement({url: tabData});

  const {left, top, width, height, surfaceWidth} = area;
  const scale = img.naturalWidth / surfaceWidth;

  const {cnv, ctx} = getCanvas(width * scale, height * scale);

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
  const [surfaceWidth] = await executeScript({
    func: () => window.innerWidth,
    code: `window.innerWidth;`,
    tabId
  });
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
    // Firefox MV2
    return new content.XMLHttpRequest();
  } catch (err) {
    return new XMLHttpRequest();
  }
}

function getAbortSignal(timeout) {
  if (AbortSignal.timeout) {
    return AbortSignal.timeout(timeout);
  } else {
    const controller = new AbortController();
    self.setTimeout(() => controller.abort(), timeout);

    return controller.signal;
  }
}

async function fetchImage(
  url,
  {credentials = false, timeout = 120000, token = ''} = {}
) {
  if (mv3) {
    const params = {method: 'GET', mode: 'cors'};

    if (timeout) {
      params.signal = getAbortSignal(timeout);
    }

    if (credentials) {
      params.credentials = 'include';
    }

    try {
      const rsp = await fetch(url, params);

      return await rsp.blob();
    } catch (err) {}
  } else {
    return new Promise(resolve => {
      const xhr = getContentXHR();

      xhr.open('GET', url);
      if (timeout) {
        xhr.timeout = timeout;
      }
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
}

async function fetchImageFromBackgroundScript(url) {
  const imageDataUrl = await sendLargeMessage({
    message: {id: 'fetchImage', url},
    transferResponse: true
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
      browser.runtime.getURL('/src/background/script.js')
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

function waitForMessage({port, checkMessage = null, timeout = 120000} = {}) {
  let isMessage;
  const syncCallback = function (message) {
    if (checkMessage(message)) {
      isMessage = true;
    }
  };

  port.onMessage.addListener(syncCallback);

  return new Promise((resolve, reject) => {
    const finish = function () {
      removeCallbacks();

      resolve();
    };

    const asyncCallback = function (message) {
      if (checkMessage(message)) {
        finish();
      }
    };

    const removeCallbacks = function ({throwError = false} = {}) {
      self.clearTimeout(timeoutId);
      port.onDisconnect.removeListener(timeoutCallback);
      port.onMessage.removeListener(syncCallback);
      port.onMessage.removeListener(asyncCallback);

      if (throwError) {
        reject();
      }
    };

    const timeoutCallback = function () {
      removeCallbacks({throwError: true});
    };

    port.onDisconnect.addListener(timeoutCallback);
    const timeoutId = self.setTimeout(timeoutCallback, timeout);

    if (isMessage) {
      finish();
    } else {
      port.onMessage.addListener(asyncCallback);
    }
  });
}

async function sendLargeMessage({
  target = 'runtime',
  tabId,
  frameId,
  messagePort,
  message,
  transferResponse = false,
  openConnection = false
} = {}) {
  let messageError;
  if (!transferResponse) {
    try {
      if (target === 'runtime') {
        return await browser.runtime.sendMessage(message);
      } else if (target === 'tab') {
        return await browser.tabs.sendMessage(tabId, message, {frameId});
      } else if (target === 'port') {
        return messagePort.postMessage(message);
      }
    } catch (err) {
      messageError = err;
    }
  }

  const transferId = uuidv4();

  // maxMessageSize is small enough to disregard size differences
  // caused by Unicode characters in encodedMessage
  const maxMessageSize = getMaxExtensionMessageSize();
  const encodedMessage = JSON.stringify(message);

  const transferMessage =
    Boolean(messageError) || encodedMessage.length > maxMessageSize;

  const isConnectionOwner = !Boolean(messagePort);

  if (openConnection) {
    messagePort = browser.runtime.connect({name: `message_${transferId}`});

    const progress = waitForMessage({
      port: messagePort,
      checkMessage: function (message) {
        if (
          message.transfer?.id === transferId &&
          message.transfer.type === 'connection' &&
          message.transfer.complete
        ) {
          return true;
        }
      }
    });

    await progress;
  }

  return new Promise(async (resolve, reject) => {
    let response = [];

    const messageCallback = function (message) {
      if (message.transfer?.id !== transferId) {
        return;
      }

      if (message.transfer?.type === 'chunkedMessage') {
        for (const data of splitAsciiString(encodedMessage, maxMessageSize)) {
          messagePort.postMessage({
            transfer: {type: 'chunkedMessage', data, id: transferId}
          });
        }

        messagePort.postMessage({
          transfer: {type: 'chunkedMessage', complete: true, id: transferId}
        });
      } else if (message.transfer?.type === 'chunkedResponse') {
        if (message.transfer.complete) {
          response = JSON.parse(response.join(''));
        } else {
          response.push(message.transfer.data);
        }
      } else if (message.transfer?.type === 'response') {
        response = message.transfer.data;
      }
    };

    let connectCallback;
    if (messagePort) {
      messagePort.onMessage.addListener(messageCallback);
    } else {
      connectCallback = function (port) {
        if (port.name === transferId) {
          messagePort = port;
          messagePort.onMessage.addListener(messageCallback);

          messagePort.postMessage({
            transfer: {type: 'connection', complete: true, id: transferId}
          });
        }
      };

      browser.runtime.onConnect.addListener(connectCallback);
    }

    const removeCallbacks = function (error) {
      if (connectCallback) {
        browser.runtime.onConnect.removeListener(connectCallback);
      }

      if (messagePort) {
        messagePort.onMessage.removeListener(messageCallback);

        if (isConnectionOwner) {
          try {
            messagePort.disconnect();
          } catch (err) {}
        }
      }

      if (error) {
        reject(error);
      }
    };

    let result = null;
    try {
      const transfer = {
        transferId,
        transferMessage,
        transferResponse,
        openConnection: !openConnection
      };
      const data = transferMessage ? {transfer} : {...message, transfer};

      if (target === 'runtime') {
        result = await browser.runtime.sendMessage(data);
      } else if (target === 'tab') {
        result = await browser.tabs.sendMessage(tabId, data, {frameId});
      } else if (target === 'port') {
        const progress = waitForMessage({
          port: messagePort,
          checkMessage: function (message) {
            if (
              message.transfer?.id === transferId &&
              message.transfer.type === 'message' &&
              message.transfer.complete
            ) {
              return true;
            }
          }
        });

        messagePort.postMessage(data);

        await progress;
      }
    } catch (err) {
      removeCallbacks(err);
    }

    removeCallbacks();

    resolve(transferResponse ? response : result);
  });
}

async function processLargeMessage({
  request,
  sender,
  requestHandler,
  messagePortProvider
} = {}) {
  if (request.transfer?.type) {
    // Internal message used for data transfer
    return;
  }

  // Samsung Internet 13: extension messages are sometimes also dispatched
  // to the sender frame.
  if (sender.url === self.location.href) {
    return;
  }

  if (targetEnv === 'samsung') {
    if (
      /^internet-extension:\/\/.*\/src\/action\/index.html/.test(
        sender.tab?.url
      )
    ) {
      // Samsung Internet 18: runtime.onMessage provides sender.tab
      // when the message is sent from the browser action,
      // and tab.id refers to a nonexistent tab.
      sender.tab = null;
    }

    if (await isValidTab({tab: sender.tab})) {
      // Samsung Internet 13: runtime.onMessage provides wrong tab index.
      sender.tab = await browser.tabs.get(sender.tab.id);
    }
  }

  const transfer = request.transfer;

  if (transfer) {
    const transferId = transfer.transferId;

    const isPortMessage = typeof sender.disconnect === 'function';

    let messagePort;
    if (isPortMessage) {
      messagePort = sender;
    } else if (transfer.openConnection) {
      if (sender.tab) {
        messagePort = browser.tabs.connect(sender.tab.id, {
          name: transferId,
          frameId: sender.frameId
        });
      } else {
        messagePort = browser.runtime.connect({name: transferId});
      }

      const progress = waitForMessage({
        port: messagePort,
        checkMessage: function (message) {
          if (
            message.transfer?.id === transferId &&
            message.transfer.type === 'connection' &&
            message.transfer.complete
          ) {
            return true;
          }
        }
      });

      await progress;
    } else {
      messagePort = await messagePortProvider(transferId);
    }

    if (transfer.transferMessage) {
      request = await new Promise((resolve, reject) => {
        const messageData = [];

        const messageCallback = function (message) {
          if (message.transfer?.id !== transferId) {
            return;
          }

          if (message.transfer?.type === 'chunkedMessage') {
            if (message.transfer.complete) {
              removeCallbacks();

              resolve(JSON.parse(messageData.join('')));
            } else {
              messageData.push(message.transfer.data);
            }
          }
        };

        const removeCallbacks = function ({throwError = false} = {}) {
          self.clearTimeout(timeoutId);
          messagePort.onDisconnect.removeListener(timeoutCallback);
          messagePort.onMessage.removeListener(messageCallback);

          if (throwError) {
            reject();
          }
        };

        const timeoutCallback = function () {
          removeCallbacks({throwError: true});
        };

        messagePort.onDisconnect.addListener(timeoutCallback);
        const timeoutId = self.setTimeout(timeoutCallback, 120000); // 2 minutes

        messagePort.onMessage.addListener(messageCallback);

        // Request message transfer
        messagePort.postMessage({
          transfer: {type: 'chunkedMessage', id: transferId}
        });
      });

      if (isPortMessage) {
        // Signal message transfer end
        messagePort.postMessage({
          transfer: {type: 'message', complete: true, id: transferId}
        });
      }
    }

    let response = await requestHandler(request, sender);

    if (!isPortMessage) {
      // Messages sent through a port do not return responses

      if (transfer.transferResponse) {
        if (response === undefined) {
          response = null;
        }

        try {
          messagePort.postMessage({
            transfer: {type: 'response', data: response, id: transferId}
          });
        } catch (err) {
          const maxMessageSize = getMaxExtensionMessageSize();
          const encodedMessage = JSON.stringify(response);

          for (const data of splitAsciiString(encodedMessage, maxMessageSize)) {
            messagePort.postMessage({
              transfer: {type: 'chunkedResponse', data, id: transferId}
            });
          }

          messagePort.postMessage({
            transfer: {type: 'chunkedResponse', complete: true, id: transferId}
          });
        }
      } else {
        return response;
      }
    }
  } else {
    return requestHandler(request, sender);
  }
}

function processMessageResponse(response, sendResponse) {
  if (targetEnv === 'safari') {
    response.then(function (result) {
      // Safari 15: undefined response will cause sendMessage to never resolve.
      if (result === undefined) {
        result = null;
      }
      sendResponse(result);
    });

    return true;
  } else {
    return response;
  }
}

function getMaxExtensionMessageSize() {
  if (targetEnv === 'firefox') {
    return 80 * 1024 * 1024;
  } else {
    return 40 * 1024 * 1024;
  }
}

function getMaxDataUrlSize() {
  if (['firefox', 'safari'].includes(targetEnv)) {
    return 30 * 1024 * 1024;
  } else {
    return Infinity;
  }
}

async function hasClipboardReadPermission() {
  return browser.permissions.contains({permissions: ['clipboardRead']});
}

async function requestClipboardReadPermission() {
  // Safari: requesting clipboard access is handled by the browser
  if (targetEnv === 'safari') {
    return true;
  }

  return browser.permissions.request({permissions: ['clipboardRead']});
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
  hasModule,
  insertBaseModule,
  loadFonts,
  configApp,
  getAppTheme,
  addSystemThemeListener,
  addAppThemeListener,
  addThemeListener,
  getOpenerTabId,
  showPage,
  autoShowContributePage,
  updateUseCount,
  processAppUse,
  showContributePage,
  showOptionsPage,
  showSupportPage,
  setAppVersion,
  isSessionStartup,
  isStartup,
  getStartupState,
  getNetRequestRuleIds,
  getEngineIcon,
  getEngineMenuIcon,
  handleActionEscapeKey,
  isContextMenuSupported,
  checkSearchEngineAccess,
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
  getMaxImageDimension,
  limitImageDimensions,
  convertImage,
  convertProcessedImage,
  getImageElement,
  captureVisibleTabArea,
  captureImage,
  imageFileExtToMimeType,
  imageMimeTypeToFileExt,
  isImageMimeType,
  isImageFileExt,
  getDataFromImageUrl,
  getContentXHR,
  getAbortSignal,
  fetchImage,
  fetchImageFromBackgroundScript,
  getLargeImageMessage,
  getMaxImageUploadSize,
  getFilesFromClipboard,
  getImagesFromClipboard,
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
  getFormattedImageDetails,
  getFormattedImageDimension,
  getFormattedImageSize,
  getFormattedImageType,
  isPreviewImageValid,
  getExtensionUrlPattern,
  getImageUrlFromContextMenuEvent,
  processImageUrl,
  waitForMessage,
  sendLargeMessage,
  processLargeMessage,
  processMessageResponse,
  getMaxExtensionMessageSize,
  getMaxDataUrlSize,
  hasClipboardReadPermission,
  requestClipboardReadPermission
};
