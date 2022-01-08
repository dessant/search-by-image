import browser from 'webextension-polyfill';

const token = new URL(window.location.href).searchParams.get('id');

function setLocation(tabUrl, keepHistory) {
  // Function may be called multiple times.
  if (self.locationUpdated) {
    return;
  } else {
    self.locationUpdated = true;
  }

  if (keepHistory) {
    window.location.href = tabUrl;
  } else {
    window.location.replace(tabUrl);
  }
}

async function getLocationData() {
  if (token) {
    return browser.runtime.sendMessage({
      id: 'storageRequest',
      asyncResponse: true,
      saveReceipt: true,
      storageId: token
    });
  }
}

async function start() {
  const data = await getLocationData();
  if (data) {
    setLocation(data.tabUrl, data.keepHistory);
  }
}

function onMessage(request, sender) {
  // Samsung Internet 13: extension messages are sometimes also dispatched
  // to the sender frame.
  if (sender.url === document.URL) {
    return;
  }

  if (request.id === 'setTabLocation' && request.token === token) {
    start();
  }
}

function init() {
  browser.runtime.onMessage.addListener(onMessage);

  start();
}

init();
