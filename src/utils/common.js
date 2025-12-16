import {v4 as uuidv4} from 'uuid';

import storage from 'storage/storage';
import {getScriptFunction} from 'utils/scripts';
import {targetEnv, mv3} from 'utils/config';

function getText(messageName, substitutions) {
  return browser.i18n.getMessage(messageName, substitutions);
}

function insertCSS({
  files = null,
  css = null,
  tabId = null,
  frameIds = [0],
  allFrames = false,
  origin = 'USER'
}) {
  if (mv3) {
    const params = {target: {tabId}};

    // Safari 17: allFrames and frameIds cannot both be specified,
    // fixed in Safari 18.
    if (allFrames) {
      params.target.allFrames = true;
    } else {
      params.target.frameIds = frameIds;
    }

    if (files) {
      params.files = files;
    } else {
      params.css = css;
    }

    if (targetEnv !== 'safari') {
      params.origin = origin;
    }

    return browser.scripting.insertCSS(params);
  } else {
    const params = {frameId: frameIds[0]};

    if (files) {
      params.file = files[0];
    } else {
      params.code = code;
    }

    return browser.tabs.insertCSS(tabId, params);
  }
}

async function executeScript({
  files = null,
  func = null,
  args = null,
  tabId = null,
  frameIds = [0],
  allFrames = false,
  world = 'ISOLATED',
  injectImmediately = true,
  unwrapResults = true,

  code = ''
}) {
  if (mv3 || (targetEnv === 'firefox' && (await getBrowserVersion()) >= 128)) {
    const params = {target: {tabId}, world};

    // Safari 17: allFrames and frameIds cannot both be specified,
    // fixed in Safari 18.
    if (allFrames) {
      params.target.allFrames = true;
    } else {
      params.target.frameIds = frameIds;
    }

    if (files) {
      params.files = files;
    } else {
      params.func = func;

      if (args) {
        params.args = args;
      }
    }

    if (targetEnv !== 'safari') {
      params.injectImmediately = injectImmediately;
    }

    const results = await browser.scripting.executeScript(params);

    if (unwrapResults) {
      return results.map(item => item.result);
    } else {
      return results;
    }
  } else {
    const params = {frameId: frameIds[0]};

    if (files) {
      params.file = files[0];
    } else {
      params.code = code;
    }

    if (injectImmediately) {
      params.runAt = 'document_start';
    }

    return browser.tabs.executeScript(tabId, params);
  }
}

async function executeScriptMainContext({
  files = null,
  func = null,
  args = null,
  allFrames = false,
  injectImmediately = true,

  onLoadCallback = null,
  setNonce = true
} = {}) {
  // Must be called from a content script, `args[0]` must be a trusted string in MV2.
  if (mv3 || (targetEnv === 'firefox' && (await getBrowserVersion()) >= 128)) {
    return browser.runtime.sendMessage({
      id: 'executeScript',
      setSenderTabId: true,
      setSenderFrameId: true,
      params: {files, func, args, allFrames, world: 'MAIN', injectImmediately}
    });
  } else {
    if (allFrames) {
      throw new Error('Executing code in all frames is not supported in MV2.');
    }

    let nonce;
    if (setNonce && ['firefox', 'safari'].includes(targetEnv)) {
      const nonceNode = document.querySelector('script[nonce]');
      if (nonceNode) {
        nonce = nonceNode.nonce;
      }
    }

    const script = document.createElement('script');
    if (nonce) {
      script.nonce = nonce;
    }

    if (files) {
      script.onload = function (ev) {
        ev.target.remove();

        if (onLoadCallback) {
          onLoadCallback();
        }
      };

      script.src = files[0];
      document.documentElement.appendChild(script);
    } else {
      const string = `(${getScriptFunction(func).toString()})${args ? `("${args[0]}")` : '()'}`;

      script.textContent = string;
      document.documentElement.appendChild(script);

      script.remove();

      if (onLoadCallback) {
        onLoadCallback();
      }
    }
  }
}

async function scriptsAllowed({tabId, frameId = 0} = {}) {
  try {
    await executeScript({
      func: () => true,
      code: 'true;',
      tabId,
      frameIds: [frameId]
    });

    return true;
  } catch (err) {}
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

async function getActiveTab() {
  const [tab] = await browser.tabs.query({
    lastFocusedWindow: true,
    active: true
  });
  return tab;
}

async function isValidTab({tab, tabId = null} = {}) {
  if (!tab && tabId !== null) {
    tab = await browser.tabs.get(tabId).catch(err => null);
  }

  if (tab && tab.id !== browser.tabs.TAB_ID_NONE) {
    return true;
  }
}

let platformInfo;
async function getPlatformInfo() {
  if (platformInfo) {
    return platformInfo;
  }

  if (mv3) {
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

    if (mv3) {
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
  } else if (os === 'cros') {
    os = 'chromeos';
  } else if (os.includes('bsd')) {
    os = 'linux';
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
  const isChromeos = os === 'chromeos';
  const isAndroid = os === 'android';
  const isIos = os === 'ios';
  const isIpados = os === 'ipados';
  const isVisionos = os === 'visionos';

  const isMobile = ['android', 'ios', 'ipados'].includes(os);

  const isFirefox = targetEnv === 'firefox';
  const isEdge =
    ['chrome', 'edge'].includes(targetEnv) &&
    /\sedg(?:e|a|ios)?\//i.test(navigator.userAgent);
  const isOpera =
    ['chrome', 'opera'].includes(targetEnv) &&
    /\sopr\//i.test(navigator.userAgent);
  const isChrome = targetEnv === 'chrome' && !isEdge && !isOpera;
  const isSafari = targetEnv === 'safari';
  const isSamsung = targetEnv === 'samsung';

  return {
    os,
    arch,
    targetEnv,
    isWindows,
    isMacos,
    isLinux,
    isChromeos,
    isAndroid,
    isIos,
    isIpados,
    isVisionos,
    isMobile,
    isChrome,
    isEdge,
    isFirefox,
    isOpera,
    isSafari,
    isSamsung
  };
}

async function getBrowser() {
  if (!isBackgroundPageContext()) {
    return browser.runtime.sendMessage({id: 'getBrowser'});
  }

  const {name, version} = await browser.runtime.getBrowserInfo();

  return {name: name.toLowerCase(), version: version.toLowerCase()};
}

async function getBrowserVersion() {
  const {version} = await getBrowser();

  return parseInt(version.split('.')[0], 10);
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

function isBackgroundPageContext() {
  return self.location.href.startsWith(
    browser.runtime.getURL('/src/background/')
  );
}

function getExtensionDomain() {
  try {
    const {hostname} = new URL(
      browser.runtime.getURL('/src/background/script.js')
    );

    return hostname;
  } catch (err) {}

  return null;
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
    selectorType = 'css',
    validateFn = null
  } = {}
) {
  return new Promise((resolve, reject) => {
    rootNode = rootNode || document;

    const el = nodeQuerySelector(selector, {rootNode, selectorType});
    if (el && (!validateFn || validateFn(el))) {
      resolve(el);
      return;
    }

    const observer = new MutationObserver(function (mutations, obs) {
      const el = nodeQuerySelector(selector, {rootNode, selectorType});
      if (el && (!validateFn || validateFn(el))) {
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
    validateFn = null,
    reprocess = false
  } = {}
) {
  rootNode = rootNode || document;

  let node = await findNode(selector, {
    timeout,
    throwError,
    observerOptions,
    rootNode,
    selectorType,
    validateFn
  });

  if (reprocess) {
    const observer = new MutationObserver(function (mutations, obs) {
      const el = nodeQuerySelector(selector, {rootNode, selectorType});
      if (el && !el.isSameNode(node) && (!validateFn || validateFn(el))) {
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
  const eventName = uuidv4();

  function dispatchVisibilityState() {
    document.dispatchEvent(
      new CustomEvent(eventName, {detail: document.visibilityState})
    );
  }

  document.addEventListener('visibilitychange', dispatchVisibilityState, {
    capture: true
  });

  executeScriptMainContext({func: 'makeDocumentVisible', args: [eventName]});
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

function addCssClass(node, newClass, {replaceClass = ''} = {}) {
  const replaced =
    replaceClass && node.classList.replace(replaceClass, newClass);

  if (!replaced) {
    node.classList.add(newClass);
  }
}

function isOffscreenCanvasSupported() {
  // Firefox < 131: OffscreenCanvas may be disabled with the
  // gfx.offscreencanvas.enabled preference.

  if (targetEnv === 'firefox') {
    return typeof window.OffscreenCanvas !== 'undefined';
  }

  return true;
}

function isOffscreenCanvas(cnv) {
  return typeof cnv.convertToBlob !== 'undefined';
}

function isOffscreenCanvasContext(ctx) {
  return typeof ctx.canvas.convertToBlob !== 'undefined';
}

function getCanvas(width, height, {offscreen = true, contextType = '2d'} = {}) {
  let cnv, ctx;

  if (offscreen && !isOffscreenCanvasSupported()) {
    offscreen = false;
  }

  if (offscreen) {
    cnv = new OffscreenCanvas(width, height);
  } else {
    cnv = document.createElement('canvas');
    cnv.width = width;
    cnv.height = height;
  }

  if (contextType) {
    ctx = cnv.getContext(contextType);
  }

  return {cnv, ctx};
}

async function getBlankCanvasDataUrl(width, height) {
  const {cnv, ctx} = getCanvas(width, height);
  return canvasToDataUrl(cnv, {ctx, type: 'image/png'});
}

async function canvasToDataUrl(
  cnv,
  {ctx, type = 'image/png', quality = 0.8, clear = true} = {}
) {
  function cleanup() {
    if (clear) {
      ctx.clearRect(0, 0, cnv.width, cnv.height);
    }
  }

  if (!ctx) {
    ctx = cnv.getContext('2d');
  }

  let data;
  if (isOffscreenCanvas(cnv)) {
    const blob = await cnv.convertToBlob({type, quality}).catch(err => null);
    if (blob) {
      data = await blobToDataUrl(blob);
    }
  } else {
    try {
      data = cnv.toDataURL(type, quality);
    } catch (err) {}
  }

  cleanup();

  return data;
}

async function canvasToBlob(
  cnv,
  {ctx, type = 'image/png', quality = 0.8, clear = true} = {}
) {
  function cleanup() {
    if (clear) {
      ctx.clearRect(0, 0, cnv.width, cnv.height);
    }
  }

  if (!ctx) {
    ctx = cnv.getContext('2d');
  }

  if (isOffscreenCanvas(cnv)) {
    let blob;
    try {
      blob = await cnv.convertToBlob({type, quality});
    } catch (err) {
    } finally {
      cleanup();
    }

    return blob;
  } else {
    return new Promise(resolve => {
      function callback(blob) {
        cleanup();
        resolve(blob);
      }

      try {
        cnv.toBlob(callback, type, quality);
      } catch (err) {
        cleanup();
        resolve();
      }
    });
  }
}

function drawElementOnCanvas(ctx, node) {
  try {
    ctx.drawImage(node, 0, 0);
    return true;
  } catch (err) {}
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

async function blobToArray(blob) {
  return new Uint8Array(await new Response(blob).arrayBuffer());
}

function dataUrlToBlob(dataUrl) {
  return new Blob([dataUrlToArray(dataUrl)], {
    type: getDataUrlMimeType(dataUrl)
  });
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

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomString(length) {
  let text = '';
  const seed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += seed.charAt(Math.floor(Math.random() * seed.length));
  }

  return text;
}

function capitalizeFirstLetter(string, {locale = 'en-US'} = {}) {
  return string.replace(/^\p{CWU}/u, char => char.toLocaleUpperCase(locale));
}

function lowercaseFirstLetter(string, {locale = 'en-US'} = {}) {
  return string.replace(/^\p{CWL}/u, char => char.toLocaleLowerCase(locale));
}

function* splitAsciiString(string, maxBytes) {
  let start = 0;
  while (start < string.length) {
    const end = Math.min(start + maxBytes, string.length);
    yield string.slice(start, end);
    start = end;
  }
}

function stringToInt(string) {
  return parseInt(string, 10);
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

function isIndexedDbSupported() {
  // Firefox 117: IndexedDB does not work when Private Browsing is automatically
  // enabled on browser start. DOMException: A mutation operation was attempted
  // on a database that did not allow mutations.

  if (targetEnv === 'firefox' && browser.extension.inIncognitoContext) {
    return false;
  }

  return true;
}

function getStore(name, {content = null} = {}) {
  name = `${name}Store`;

  if (!self[name]) {
    self[name] = content || {};
  }

  return self[name];
}

function runOnce(name, func) {
  const store = getStore('run');

  if (!store[name]) {
    store[name] = true;

    if (!func) {
      return true;
    }

    return func();
  }
}

async function requestLock(name, func, {timeout = 60000} = {}) {
  const params = [name];
  if (timeout) {
    params.push({signal: AbortSignal.timeout(timeout)});
  }

  return navigator.locks.request(...params, func);
}

function sleep(ms) {
  return new Promise(resolve => self.setTimeout(resolve, ms));
}

export {
  getText,
  insertCSS,
  executeScript,
  executeScriptMainContext,
  scriptsAllowed,
  createTab,
  getNewTabUrl,
  getActiveTab,
  isValidTab,
  getPlatformInfo,
  getPlatform,
  getBrowser,
  getBrowserVersion,
  isAndroid,
  isMobile,
  getDarkColorSchemeQuery,
  getDayPrecisionEpoch,
  isBackgroundPageContext,
  getExtensionDomain,
  querySelectorXpath,
  nodeQuerySelector,
  findNode,
  processNode,
  waitForDocumentLoad,
  makeDocumentVisible,
  shareFiles,
  addCssClass,
  isOffscreenCanvasSupported,
  isOffscreenCanvas,
  isOffscreenCanvasContext,
  getCanvas,
  getBlankCanvasDataUrl,
  canvasToDataUrl,
  canvasToBlob,
  drawElementOnCanvas,
  getDataUrlMimeType,
  dataUrlToArray,
  blobToArray,
  dataUrlToBlob,
  blobToDataUrl,
  getRandomInt,
  getRandomString,
  capitalizeFirstLetter,
  lowercaseFirstLetter,
  splitAsciiString,
  stringToInt,
  getAbsoluteUrl,
  getDataFromUrl,
  filenameToFileExt,
  isIndexedDbSupported,
  getStore,
  runOnce,
  requestLock,
  sleep
};
