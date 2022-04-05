import browser from 'webextension-polyfill';
import {validate as uuidValidate} from 'uuid';

async function processIncomingShare(shareId) {
  const response = await browser.runtime.sendMessage({
    id: 'sendNativeMessage',
    message: {id: 'getShareId'}
  });

  if (response && response.shareId === shareId) {
    const tabUrl = `${browser.runtime.getURL(
      '/src/browse/index.html'
    )}?id=${shareId}&origin=share`;

    window.location.replace(tabUrl);
  }
}

function init() {
  const shareId = window.location.hash.substring(1);

  if (uuidValidate(shareId)) {
    processIncomingShare(shareId);
  }
}

init();
