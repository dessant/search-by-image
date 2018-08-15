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

function createTab(
  url,
  {index = null, active = true, openerTabId = null} = {}
) {
  const props = {url, active};
  if (index !== null) {
    props.index = index;
  }
  if (openerTabId !== null && ['chrome', 'opera'].includes(targetEnv)) {
    props.openerTabId = openerTabId;
  }
  return browser.tabs.create(props);
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

async function scriptsAllowed(tabId, frameId = 0) {
  try {
    await browser.tabs.executeScript(tabId, {
      frameId: frameId,
      runAt: 'document_start',
      code: 'true;'
    });
    return true;
  } catch (e) {}
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

function blobToArray(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      resolve(new Uint8Array(e.target.result));
    };
    reader.onerror = () => {
      resolve();
    };
    reader.onabort = () => {
      resolve();
    };
    reader.readAsArrayBuffer(blob);
  });
}

function blobToDataUrl(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      resolve(e.target.result);
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
  } catch (e) {}
  if (clear) {
    if (!ctx) {
      ctx = cnv.getContext('2d');
    }
    ctx.clearRect(0, 0, cnv.width, cnv.height);
  }
  return data;
}

function getAbsoluteUrl(url) {
  const a = document.createElement('a');
  a.href = url;
  return a.href;
}

async function isAndroid() {
  const {os} = await browser.runtime.getPlatformInfo();
  return os === 'android';
}

async function getActiveTab() {
  const [tab] = await browser.tabs.query({
    lastFocusedWindow: true,
    active: true
  });
  return tab;
}

export {
  onError,
  onComplete,
  getText,
  createTab,
  executeCode,
  executeFile,
  scriptsAllowed,
  getRandomString,
  getRandomInt,
  dataUrlToArray,
  dataUrlToBlob,
  blobToDataUrl,
  blobToArray,
  getBlankCanvasDataUrl,
  canvasToDataUrl,
  getAbsoluteUrl,
  getDataUrlMimeType,
  isAndroid,
  getActiveTab
};
