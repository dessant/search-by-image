import browser from 'webextension-polyfill';

const getText = browser.i18n.getMessage;

function onError(error) {
  console.log(`Error: ${error}`);
}

function createTab(url, index, active = true) {
  const props = {url: url, active: active};
  if (typeof index !== 'undefined') {
    props['index'] = index;
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

module.exports = {
  onError,
  getText,
  createTab,
  executeCode,
  executeFile,
  getRandomString,
  getRandomInt
};
