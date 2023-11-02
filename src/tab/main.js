async function getLocationData() {
  const token = new URL(window.location.href).searchParams.get('id');

  return browser.runtime.sendMessage({
    id: 'storageRequest',
    asyncResponse: true,
    saveReceipt: true,
    storageId: token
  });
}

function setLocation(tabUrl, keepHistory) {
  if (keepHistory) {
    window.location.href = tabUrl;
  } else {
    window.location.replace(tabUrl);
  }
}

async function setupTab(steps) {
  return browser.runtime.sendMessage({id: 'setupTab', steps});
}

async function start() {
  const data = await getLocationData();

  if (data.setupSteps) {
    await setupTab(data.setupSteps);
  }

  setLocation(data.tabUrl, data.keepHistory);
}

function init() {
  start();
}

init();
