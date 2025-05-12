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

async function setupTab(data) {
  return browser.runtime.sendMessage({id: 'setupTab', data});
}

async function start() {
  const data = await getLocationData();

  if (data.tabSetupData) {
    await setupTab(data.tabSetupData);
  }

  setLocation(data.tabUrl, data.keepHistory);
}

function init() {
  start();
}

init();
