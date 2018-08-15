import browser from 'webextension-polyfill';
import {difference, isString} from 'lodash-es';
import fileType from 'file-type';

import storage from 'storage/storage';
import {
  getText,
  createTab,
  getActiveTab,
  getDataUrlMimeType,
  dataUrlToArray,
  blobToArray,
  blobToDataUrl
} from 'utils/common';
import {engines, imageMimeTypes} from 'utils/data';

async function getEnabledEngines(options) {
  if (typeof options === 'undefined') {
    options = await storage.get(['engines', 'disabledEngines'], 'sync');
  }
  return difference(options.engines, options.disabledEngines);
}

async function getSupportedEngines(imgData, targetEngines) {
  const supportedEngines = [];
  for (const engine of targetEngines) {
    if (imgData.objectUrl || (imgData.url && (await hasUrlSupport(engine)))) {
      supportedEngines.push(engine);
    }
  }

  return supportedEngines;
}

async function getSearches(imgData, targetEngines) {
  const searches = [];
  for (const engine of targetEngines) {
    const method = (await isUploadSearch(imgData, engine)) ? 'upload' : 'url';
    const isExec = engines[engine][method].isExec;
    const isDataKey = engines[engine][method].isDataKey;
    searches.push({
      engine,
      method,
      isExec,
      isDataKey,
      sendsReceipt: isExec || isDataKey
    });
  }

  return searches;
}

async function isUploadSearch(imgData, engine) {
  return imgData.mustUpload || !imgData.url || !(await hasUrlSupport(engine));
}

async function hasUrlSupport(engine) {
  let targetEngines =
    engine === 'allEngines' ? await getEnabledEngines() : [engine];
  for (const engine of targetEngines) {
    if (!engines[engine].url) {
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
  return browser.notifications.create(`sbi-notification-${type}`, {
    type: 'basic',
    title: title,
    message: message,
    iconUrl: '/src/icons/app/icon-48.png'
  });
}

function getOptionLabels(data, scope = 'optionValue') {
  const labels = {};
  for (const [group, items] of Object.entries(data)) {
    labels[group] = [];
    items.forEach(function(value) {
      labels[group].push({
        id: value,
        label: getText(`${scope}_${group}_${value}`)
      });
    });
  }
  return labels;
}

async function showContributePage(action = false) {
  await storage.set({contribPageLastOpen: new Date().getTime()}, 'sync');
  const activeTab = await getActiveTab();
  let url = browser.extension.getURL('/src/contribute/index.html');
  if (action) {
    url = `${url}?action=${action}`;
  }
  await createTab(url, {index: activeTab.index + 1});
}

function validateUrl(url) {
  if (!isString(url) || url.length > 2048) {
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    return;
  }

  if (!/^(?:https?|ftp):$/i.test(parsedUrl.protocol)) {
    return;
  }

  return true;
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

  const {mime: realType} = fileType(array) || {};

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

  return {data, type, ext};
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

export {
  getEnabledEngines,
  getSupportedEngines,
  getSearches,
  isUploadSearch,
  hasUrlSupport,
  showNotification,
  getOptionLabels,
  showContributePage,
  validateUrl,
  normalizeFilename,
  normalizeImage,
  getImageElement
};
