import browser from 'webextension-polyfill';

import {getMaxImageSize, getLargeImageMessage} from 'utils/app';
import {dataUrlToBlob} from 'utils/common';

function getXHR() {
  try {
    // Firefox
    return new content.XMLHttpRequest();
  } catch (err) {
    // Chrome
    return new XMLHttpRequest();
  }
}

function getDataTransfer() {
  try {
    // Firefox
    return new window.wrappedJSObject.DataTransfer();
  } catch (err) {
    // Chrome
    return new DataTransfer();
  }
}

function getValidHostname(validHostnames, engine) {
  const hostname = window.location.hostname;
  if (!validHostnames.includes(hostname)) {
    throw new Error(`Invalid ${engine} hostname: ${hostname}`);
  }
  return hostname;
}

function setFileInputData(input, image) {
  const fileData = new File([image.imageBlob], image.imageFilename, {
    type: image.imageType
  });

  const data = new DataTransfer();
  data.items.add(fileData);

  input.files = data.files;
}

function showEngineError({message, errorId, engine}) {
  if (!message) {
    message = browser.i18n.getMessage(
      errorId,
      browser.i18n.getMessage(`engineName_${engine}`)
    );
  }
  browser.runtime.sendMessage({
    id: 'notification',
    message,
    type: `${engine}Error`
  });
}

function uploadCallback(xhr, callback, engine) {
  try {
    callback(xhr);
  } catch (err) {
    showEngineError({errorId: 'error_engine', engine});

    console.log(err.toString());
    throw err;
  }
}

async function initUpload(uploadFunc, engine, sessionKey) {
  // Script may be injected multiple times
  if (typeof self.session === 'undefined') {
    self.session = null;
  } else {
    return;
  }

  self.session = await browser.runtime.sendMessage({
    id: 'storageRequest',
    asyncResponse: true,
    storageKey: sessionKey
  });

  if (session) {
    try {
      if (session.search.method === 'upload') {
        const maxSize = getMaxImageSize(engine);
        if (session.search.imageSize > maxSize) {
          showEngineError({
            message: getLargeImageMessage(engine, maxSize),
            engine
          });
          return;
        }
      }

      const image = await browser.runtime.sendMessage({
        id: 'storageRequest',
        asyncResponse: true,
        storageKey: session.imageKey
      });

      if (image) {
        if (session.search.method === 'upload') {
          image.imageBlob = dataUrlToBlob(image.imageDataUrl);
        }
        await uploadFunc({task: session.task, search: session.search, image});
      } else {
        showEngineError({errorId: 'error_sessionExpired', engine});
      }
    } catch (err) {
      showEngineError({errorId: 'error_engine', engine});

      console.log(err.toString());
      throw err;
    }
  } else {
    showEngineError({errorId: 'error_sessionExpired', engine});
  }
}

export {
  getXHR,
  getDataTransfer,
  getValidHostname,
  setFileInputData,
  showEngineError,
  uploadCallback,
  initUpload
};
