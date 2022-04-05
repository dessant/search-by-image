import browser from 'webextension-polyfill';
import {validate as uuidValidate} from 'uuid';

function getShareId() {
  // Safari: message may be sent before the background page
  // event listener has been initialized on browser start
  return new Promise((resolve, reject) => {
    let stop;

    const sendMessage = async function () {
      const data = await browser.runtime.sendMessage({
        id: 'sendNativeMessage',
        message: {id: 'getShareId'}
      });
      if (data) {
        window.clearTimeout(timeoutId);
        resolve(data.response);
      } else if (stop) {
        reject(new Error('Background page is not ready'));
      } else {
        window.setTimeout(sendMessage, 30);
      }
    };

    const timeoutId = window.setTimeout(function () {
      stop = true;
    }, 60000); // 1 minute

    sendMessage();
  });
}

async function processIncomingShare(shareId) {
  const response = await getShareId();

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
