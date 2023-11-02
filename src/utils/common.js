import {v4 as uuidv4} from 'uuid';

import {isStorageArea} from 'storage/storage';
import storage from 'storage/storage';
import {targetEnv} from 'utils/config';

function getText(messageName, substitutions) {
  return browser.i18n.getMessage(messageName, substitutions);
}

function onError(error) {
  console.log(`Error: ${error}`);
}

function onComplete() {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTab({
  url = '',
  token = '',
  index = null,
  active = true,
  openerTabId = null,
  getTab = false
} = {}) {
  if (!url) {
    url = getNewTabUrl(token);
  }

  const props = {url, active};

  if (index !== null) {
    props.index = index;
  }
  if (openerTabId !== null) {
    props.openerTabId = openerTabId;
  }

  let tab = await browser.tabs.create(props);

  if (getTab) {
    if (targetEnv === 'samsung') {
      // Samsung Internet 13: tabs.create returns previously active tab.
      // Samsung Internet 13: tabs.query may not immediately return newly created tabs.
      let count = 1;
      while (count <= 500 && (!tab || tab.url !== url)) {
        [tab] = await browser.tabs.query({lastFocusedWindow: true, url});

        await sleep(20);
        count += 1;
      }
    }

    return tab;
  }
}

function getNewTabUrl(token) {
  if (!token) {
    token = uuidv4();
  }

  return `${browser.runtime.getURL('/src/tab/index.html')}?id=${token}`;
}

function executeCode(string, tabId, frameId = 0, runAt = 'document_start') {
  return browser.tabs.executeScript(tabId, {
    frameId: frameId,
    runAt: runAt,
    code: string
  });
}

function executeFile(file, tabId, frameId = 0, runAt = 'document_start') {
  return browser.tabs.executeScript(tabId, {
    frameId: frameId,
    runAt: runAt,
    file: file
  });
}

function executeCodeMainContext(
  string,
  {nonce = '', onLoadCallback = null} = {}
) {
  const script = document.createElement('script');
  if (nonce) {
    script.nonce = nonce;
  }

  script.textContent = string;
  document.documentElement.appendChild(script);

  script.remove();

  if (onLoadCallback) {
    onLoadCallback();
  }
}

function executeFileMainContext(
  file,
  {nonce = '', onLoadCallback = null} = {}
) {
  const script = document.createElement('script');
  if (nonce) {
    script.nonce = nonce;
  }

  script.onload = function (ev) {
    ev.target.remove();

    if (onLoadCallback) {
      onLoadCallback();
    }
  };

  script.src = file;
  document.documentElement.appendChild(script);
}

function getRandomString(length) {
  let text = '';
  const seed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += seed.charAt(Math.floor(Math.random() * seed.length));
  }

  return text;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDataUrlMimeType(dataUrl) {
  return dataUrl
    .slice(0, 100)
    .split(',')[0]
    .split(':')[1]
    .split(';')[0]
    .toLowerCase();
}

function dataUrlToArray(dataUrl) {
  const [meta, data] = dataUrl.split(',');
  let byteString;
  if (meta.endsWith(';base64')) {
    byteString = atob(data);
  } else {
    byteString = unescape(data);
  }
  const length = byteString.length;

  const array = new Uint8Array(new ArrayBuffer(length));
  for (let i = 0; i < length; i++) {
    array[i] = byteString.charCodeAt(i);
  }

  return array;
}

function dataUrlToBlob(dataUrl) {
  return new Blob([dataUrlToArray(dataUrl)], {
    type: getDataUrlMimeType(dataUrl)
  });
}

async function blobToArray(blob) {
  return new Uint8Array(await new Response(blob).arrayBuffer());
}

function blobToDataUrl(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      resolve(ev.target.result);
    };
    reader.onerror = () => {
      resolve();
    };
    reader.onabort = () => {
      resolve();
    };
    reader.readAsDataURL(blob);
  });
}

function* splitAsciiString(string, maxBytes) {
  let start = 0;
  while (start < string.length) {
    const end = Math.min(start + maxBytes, string.length);
    yield string.slice(start, end);
    start = end;
  }
}

function getBlankCanvasDataUrl(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas.toDataURL('image/png');
}

function canvasToDataUrl(
  cnv,
  {ctx, type = 'image/png', quality = 0.8, clear = true} = {}
) {
  let data;
  try {
    data = cnv.toDataURL(type, quality);
  } catch (err) {}
  if (clear) {
    if (!ctx) {
      ctx = cnv.getContext('2d');
    }
    ctx.clearRect(0, 0, cnv.width, cnv.height);
  }
  return data;
}

function canvasToBlob(
  cnv,
  {ctx, type = 'image/png', quality = 0.8, clear = true} = {}
) {
  return new Promise(resolve => {
    function callback(blob) {
      cleanup();
      resolve(blob);
    }

    function cleanup() {
      if (clear) {
        if (!ctx) {
          ctx = cnv.getContext('2d');
        }
        ctx.clearRect(0, 0, cnv.width, cnv.height);
      }
    }

    try {
      cnv.toBlob(callback, type, quality);
    } catch (err) {
      cleanup();
      resolve();
    }
  });
}

function drawElementOnCanvas(ctx, node) {
  try {
    ctx.drawImage(node, 0, 0);
    return true;
  } catch (err) {}
}

function getAbsoluteUrl(url) {
  const a = document.createElement('a');
  a.href = url;
  return a.href;
}

function getDataFromUrl(url) {
  const file = url
    .split('/')
    .pop()
    .replace(/(?:#|\?).*?$/, '')
    .split('.');
  let name = '';
  let ext = '';
  if (file.length === 1) {
    name = file[0];
  } else {
    name = file.join('.');
    ext = file.pop().toLowerCase();
  }

  return {name, ext};
}

function filenameToFileExt(name) {
  return (/(?:\.([^.]+))?$/.exec(name)[1] || '').toLowerCase();
}

function querySelectorXpath(selector, {rootNode = null} = {}) {
  rootNode = rootNode || document;

  return document.evaluate(
    selector,
    rootNode,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
}

function nodeQuerySelector(
  selector,
  {rootNode = null, selectorType = 'css'} = {}
) {
  rootNode = rootNode || document;

  return selectorType === 'css'
    ? rootNode.querySelector(selector)
    : querySelectorXpath(selector, {rootNode});
}

function findNode(
  selector,
  {
    timeout = 60000,
    throwError = true,
    observerOptions = null,
    rootNode = null,
    selectorType = 'css'
  } = {}
) {
  return new Promise((resolve, reject) => {
    rootNode = rootNode || document;

    const el = nodeQuerySelector(selector, {rootNode, selectorType});
    if (el) {
      resolve(el);
      return;
    }

    const observer = new MutationObserver(function (mutations, obs) {
      const el = nodeQuerySelector(selector, {rootNode, selectorType});
      if (el) {
        obs.disconnect();
        window.clearTimeout(timeoutId);
        resolve(el);
      }
    });

    const options = {
      childList: true,
      subtree: true
    };
    if (observerOptions) {
      Object.assign(options, observerOptions);
    }

    observer.observe(rootNode, options);

    const timeoutId = window.setTimeout(function () {
      observer.disconnect();

      if (throwError) {
        reject(new Error(`DOM node not found: ${selector}`));
      } else {
        resolve();
      }
    }, timeout);
  });
}

async function processNode(
  selector,
  actionFn,
  {
    timeout = 60000,
    throwError = true,
    observerOptions = null,
    rootNode = null,
    selectorType = 'css',
    reprocess = false
  } = {}
) {
  rootNode = rootNode || document;

  let node = await findNode(selector, {
    timeout,
    throwError,
    observerOptions,
    rootNode,
    selectorType
  });

  if (reprocess) {
    const observer = new MutationObserver(function (mutations, obs) {
      const el = nodeQuerySelector(selector, {rootNode, selectorType});
      if (el && !el.isSameNode(node)) {
        node = el;
        actionFn(node);
      }
    });

    const options = {
      childList: true,
      subtree: true
    };
    if (observerOptions) {
      Object.assign(options, observerOptions);
    }

    observer.observe(rootNode, options);

    window.setTimeout(function () {
      observer.disconnect();
    }, timeout);
  }

  return actionFn(node);
}

async function getActiveTab() {
  const [tab] = await browser.tabs.query({
    lastFocusedWindow: true,
    active: true
  });
  return tab;
}

let platformInfo;
async function getPlatformInfo() {
  if (platformInfo) {
    return platformInfo;
  }

  const isSessionStorage = await isStorageArea({area: 'session'});

  if (isSessionStorage) {
    ({platformInfo} = await storage.get('platformInfo', {area: 'session'}));
  } else {
    try {
      platformInfo = JSON.parse(window.sessionStorage.getItem('platformInfo'));
    } catch (err) {}
  }

  if (!platformInfo) {
    let os, arch;

    if (targetEnv === 'samsung') {
      // Samsung Internet 13: runtime.getPlatformInfo fails.
      os = 'android';
      arch = '';
    } else if (targetEnv === 'safari') {
      // Safari: runtime.getPlatformInfo returns 'ios' on iPadOS.
      ({os, arch} = await browser.runtime.sendNativeMessage('application.id', {
        id: 'getPlatformInfo'
      }));
    } else {
      ({os, arch} = await browser.runtime.getPlatformInfo());
    }

    platformInfo = {os, arch};

    if (isSessionStorage) {
      await storage.set({platformInfo}, {area: 'session'});
    } else {
      try {
        window.sessionStorage.setItem(
          'platformInfo',
          JSON.stringify(platformInfo)
        );
      } catch (err) {}
    }
  }

  return platformInfo;
}

async function getPlatform() {
  if (!isBackgroundPageContext()) {
    return browser.runtime.sendMessage({id: 'getPlatform'});
  }

  let {os, arch} = await getPlatformInfo();

  if (os === 'win') {
    os = 'windows';
  } else if (os === 'mac') {
    os = 'macos';
  }

  if (['x86-32', 'i386'].includes(arch)) {
    arch = '386';
  } else if (['x86-64', 'x86_64'].includes(arch)) {
    arch = 'amd64';
  } else if (arch.startsWith('arm')) {
    arch = 'arm';
  }

  const isWindows = os === 'windows';
  const isMacos = os === 'macos';
  const isLinux = os === 'linux';
  const isAndroid = os === 'android';
  const isIos = os === 'ios';
  const isIpados = os === 'ipados';

  const isMobile = ['android', 'ios', 'ipados'].includes(os);

  const isChrome = targetEnv === 'chrome';
  const isEdge =
    ['chrome', 'edge'].includes(targetEnv) &&
    /\sedg(?:e|a|ios)?\//i.test(navigator.userAgent);
  const isFirefox = targetEnv === 'firefox';
  const isOpera =
    ['chrome', 'opera'].includes(targetEnv) &&
    /\sopr\//i.test(navigator.userAgent);
  const isSafari = targetEnv === 'safari';
  const isSamsung = targetEnv === 'samsung';

  return {
    os,
    arch,
    targetEnv,
    isWindows,
    isMacos,
    isLinux,
    isAndroid,
    isIos,
    isIpados,
    isMobile,
    isChrome,
    isEdge,
    isFirefox,
    isOpera,
    isSafari,
    isSamsung
  };
}

async function shareFiles(files) {
  if (navigator.canShare && navigator.canShare({files})) {
    try {
      await navigator.share({files});
    } catch (err) {
      if (err.name !== 'AbortError') {
        throw err;
      }
    }
  } else {
    throw new Error('File sharing not supported');
  }
}

async function isAndroid() {
  return (await getPlatform()).isAndroid;
}

async function isMobile() {
  return (await getPlatform()).isMobile;
}

function getDarkColorSchemeQuery() {
  return window.matchMedia('(prefers-color-scheme: dark)');
}

function getDayPrecisionEpoch(epoch) {
  if (!epoch) {
    epoch = Date.now();
  }

  return epoch - (epoch % 86400000);
}

function addCssClass(node, newClass, {replaceClass = ''} = {}) {
  const replaced =
    replaceClass && node.classList.replace(replaceClass, newClass);

  if (!replaced) {
    node.classList.add(newClass);
  }
}

function waitForDocumentLoad() {
  return new Promise(resolve => {
    function checkState() {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        document.addEventListener('readystatechange', checkState, {once: true});
      }
    }

    checkState();
  });
}

function makeDocumentVisible() {
  // Script may be injected multiple times.
  if (self.documentVisibleModule) {
    return;
  } else {
    self.documentVisibleModule = true;
  }

  function patchContext(eventName) {
    let visibilityState = document.visibilityState;

    function updateVisibilityState(ev) {
      visibilityState = ev.detail;
    }

    document.addEventListener(eventName, updateVisibilityState, {
      capture: true
    });

    let lastCallTime = 0;
    window.requestAnimationFrame = new Proxy(window.requestAnimationFrame, {
      apply(target, thisArg, argumentsList) {
        if (visibilityState === 'visible') {
          return Reflect.apply(target, thisArg, argumentsList);
        } else {
          const currentTime = Date.now();
          const callDelay = Math.max(0, 16 - (currentTime - lastCallTime));

          lastCallTime = currentTime + callDelay;

          const timeoutId = window.setTimeout(function () {
            argumentsList[0](performance.now());
          }, callDelay);

          return timeoutId;
        }
      }
    });

    window.cancelAnimationFrame = new Proxy(window.cancelAnimationFrame, {
      apply(target, thisArg, argumentsList) {
        if (visibilityState === 'visible') {
          return Reflect.apply(target, thisArg, argumentsList);
        } else {
          window.clearTimeout(argumentsList[0]);
        }
      }
    });

    Object.defineProperty(document, 'visibilityState', {
      get() {
        return 'visible';
      }
    });

    Object.defineProperty(document, 'hidden', {
      get() {
        return false;
      }
    });

    Document.prototype.hasFocus = function () {
      return true;
    };

    function stopEvent(ev) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }

    window.addEventListener('pagehide', stopEvent, {capture: true});
    window.addEventListener('blur', stopEvent, {capture: true});

    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pageshow'));
    window.dispatchEvent(new FocusEvent('focus'));
  }

  const eventName = uuidv4();

  function dispatchVisibilityState() {
    document.dispatchEvent(
      new CustomEvent(eventName, {detail: document.visibilityState})
    );
  }

  document.addEventListener('visibilitychange', dispatchVisibilityState, {
    capture: true
  });

  executeCodeMainContext(`(${patchContext.toString()})("${eventName}")`);
}

async function isValidTab({tab, tabId = null} = {}) {
  if (!tab && tabId !== null) {
    tab = await browser.tabs.get(tabId).catch(err => null);
  }

  if (tab && tab.id !== browser.tabs.TAB_ID_NONE) {
    return true;
  }
}

function stringToInt(string) {
  return parseInt(string, 10);
}

function isBackgroundPageContext() {
  return (
    window.location.href ===
    browser.runtime.getURL('/src/background/index.html')
  );
}

export {
  onError,
  onComplete,
  getText,
  createTab,
  getNewTabUrl,
  executeCode,
  executeFile,
  executeCodeMainContext,
  executeFileMainContext,
  getRandomString,
  getRandomInt,
  dataUrlToArray,
  dataUrlToBlob,
  blobToDataUrl,
  blobToArray,
  splitAsciiString,
  getBlankCanvasDataUrl,
  canvasToDataUrl,
  canvasToBlob,
  drawElementOnCanvas,
  getAbsoluteUrl,
  getDataFromUrl,
  getDataUrlMimeType,
  filenameToFileExt,
  isAndroid,
  isMobile,
  getDarkColorSchemeQuery,
  getDayPrecisionEpoch,
  querySelectorXpath,
  nodeQuerySelector,
  findNode,
  processNode,
  getActiveTab,
  getPlatform,
  shareFiles,
  sleep,
  addCssClass,
  waitForDocumentLoad,
  makeDocumentVisible,
  isValidTab,
  stringToInt,
  isBackgroundPageContext
};
