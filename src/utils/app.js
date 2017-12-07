import browser from 'webextension-polyfill';
import _ from 'lodash';

import storage from 'storage/storage';
import {getText, createTab, getActiveTab} from 'utils/common';

async function getEnabledEngines(options) {
  if (typeof options === 'undefined') {
    options = await storage.get(['engines', 'disabledEngines'], 'sync');
  }
  return _.difference(options.engines, options.disabledEngines);
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
  if (url.length > 2048) {
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

async function showContributePage() {
  const activeTab = await getActiveTab();
  const url = browser.extension.getURL('/src/contribute/index.html');
  await createTab(url, activeTab.index + 1);
}

module.exports = {
  getEnabledEngines,
  showNotification,
  getOptionLabels,
  validateUrl,
  showContributePage
};
