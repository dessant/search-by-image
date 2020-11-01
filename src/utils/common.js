import browser from 'webextension-polyfill';

import {targetEnv} from 'utils/config';

const getText = browser.i18n.getMessage;

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

async function createTab(
  url,
  {index = null, active = true, openerTabId = null} = {}
) {
  const props = {url, active};
  if (index !== null) {
    props.index = index;
  }
  if (
    openerTabId !== null &&
    openerTabId !== browser.tabs.TAB_ID_NONE &&
    !(await isAndroid())
  ) {
    props.openerTabId = openerTabId;
  }

  let tab = await browser.tabs.create(props);

  if (targetEnv === 'samsung' && index !== null) {
    // Samsung Internet 13: tabs.create returns previously active tab.

    // Samsung Internet 13: tabs.query does not immediately return previously created tabs.
    await sleep(1000);

    [tab] = await browser.tabs.query({
      lastFocusedWindow: true,
      index
    });
  }

  return tab;
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
  return dataUrl.split(',')[0].split(':')[1].split(';')[0].toLowerCase();
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

function getFilenameExtFromUrl(url) {
  const file = url
    .split('/')
    .pop()
    .replace(/(?:#|\?).*?$/, '')
    .split('.');
  let filename = '';
  let ext = '';
  if (file.length === 1) {
    filename = file[0];
  } else {
    filename = file.join('.');
    ext = file.pop().toLowerCase();
  }

  return {filename, ext};
}

function findNode(
  selector,
  {timeout = 60000, throwError = true, observerOptions = null} = {}
) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) {
      resolve(el);
      return;
    }

    const observer = new MutationObserver(function (mutations, obs) {
      const el = document.querySelector(selector);
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

    observer.observe(document, options);

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

async function getActiveTab() {
  const [tab] = await browser.tabs.query({
    lastFocusedWindow: true,
    active: true
  });
  return tab;
}

async function getPlatform() {
  if (targetEnv === 'samsung') {
    // Samsung Internet 13: runtime.getPlatformInfo fails.
    return {os: 'android', arch: ''};
  }

  let {os, arch} = await browser.runtime.getPlatformInfo();
  if (os === 'win') {
    os = 'windows';
  } else if (os === 'mac') {
    os = 'macos';
  }

  if (arch === 'x86-32') {
    arch = '386';
  } else if (arch === 'x86-64') {
    arch = 'amd64';
  }

  return {os, arch};
}

async function isAndroid() {
  let os;
  try {
    ({os} = await getPlatform());
  } catch (err) {
    ({os} = await browser.runtime.sendMessage({id: 'getPlatform'}));
  }

  return os === 'android';
}

export {
  onError,
  onComplete,
  getText,
  createTab,
  executeCode,
  executeFile,
  getRandomString,
  getRandomInt,
  dataUrlToArray,
  dataUrlToBlob,
  blobToDataUrl,
  blobToArray,
  getBlankCanvasDataUrl,
  canvasToDataUrl,
  drawElementOnCanvas,
  getAbsoluteUrl,
  getFilenameExtFromUrl,
  getDataUrlMimeType,
  isAndroid,
  findNode,
  getActiveTab,
  getPlatform,
  sleep
};
