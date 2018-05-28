import browser from 'webextension-polyfill';
import _ from 'lodash';

import storage from 'storage/storage';
import {getText, createTab, getActiveTab} from 'utils/common';
import {engines} from 'utils/data';

async function getEnabledEngines(options) {
  if (typeof options === 'undefined') {
    options = await storage.get(['engines', 'disabledEngines'], 'sync');
  }
  return _.difference(options.engines, options.disabledEngines);
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

function validateUrl(url) {
  if (!_.isString(url) || url.length > 2048) {
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

async function showContributePage(action = false) {
  await storage.set({contribPageLastOpen: new Date().getTime()}, 'sync');
  const activeTab = await getActiveTab();
  let url = browser.extension.getURL('/src/contribute/index.html');
  if (action) {
    url = `${url}?action=${action}`;
  }
  await createTab(url, activeTab.index + 1);
}

module.exports = {
  getEnabledEngines,
  hasUrlSupport,
  showNotification,
  getOptionLabels,
  validateUrl,
  showContributePage
};
