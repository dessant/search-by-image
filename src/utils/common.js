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

function createTab(url, index, active = true, openerTabId) {
  const props = {url, active};
  if (typeof index !== 'undefined') {
    props.index = index;
  }
  if (
    typeof openerTabId !== 'undefined' &&
    ['chrome', 'opera'].includes(targetEnv)
  ) {
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

function getDataUriMimeType(dataUri) {
  return dataUri
    .split(',')[0]
    .split(':')[1]
    .split(';')[0]
    .toLowerCase();
}

function dataUriToBlob(dataUri) {
  let byteString;
  if (dataUri.split(',')[0].indexOf('base64') >= 0) {
    byteString = atob(dataUri.split(',')[1]);
  } else {
    byteString = unescape(dataUri.split(',')[1]);
  }

  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], {type: getDataUriMimeType(dataUri)});
}

module.exports = {
  onError,
  onComplete,
  getText,
  createTab,
  executeCode,
  executeFile,
  scriptsAllowed,
  getRandomString,
  getRandomInt,
  dataUriToBlob,
  getDataUriMimeType
};
