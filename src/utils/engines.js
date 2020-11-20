import browser from 'webextension-polyfill';
import {v4 as uuidv4} from 'uuid';

import {getMaxImageSize, getLargeImageMessage} from 'utils/app';
import {dataUrlToBlob} from 'utils/common';
import {targetEnv} from 'utils/config';

function getXHR() {
  try {
    // Firefox
    return new content.XMLHttpRequest();
  } catch (err) {
    // Chrome
    return new XMLHttpRequest();
  }
}

function getValidHostname(validHostnames, engine) {
  const hostname = window.location.hostname;
  if (!validHostnames.includes(hostname)) {
    throw new Error(`Invalid ${engine} hostname: ${hostname}`);
  }
  return hostname;
}

async function setFileInputData(selector, input, image) {
  if (targetEnv === 'safari') {
    function patchInput(eventName) {
      function dataUrlToFile(dataUrl, mimeType, filename) {
        const [meta, data] = dataUrl.split(',');

        let byteString;
        if (meta.endsWith(';base64')) {
          byteString = atob(data);
        } else {
          byteString = unescape(data);
        }
        const length = byteString.length;

        const array = new Uint8Array(new ArrayBuffer(length));
        for (let i = 0; i < length; i++) {
          array[i] = byteString.charCodeAt(i);
        }

        return new File([array], filename, {type: mimeType});
      }

      function patchFileInputProperty(data) {
        const fileData = dataUrlToFile(
          data.imageDataUrl,
          data.imageType,
          data.imageFilename
        );

        class FileList extends Array {
          item(index) {
            return this[index];
          }
        }
        const files = new FileList(fileData);

        const descriptor = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'files'
        );
        const descriptorGet = descriptor.get;
        descriptor.get = function () {
          const input = document.querySelector(data.selector);
          if (this.isSameNode(input)) {
            return files;
          } else {
            return descriptorGet.apply(this);
          }
        };
        Object.defineProperty(HTMLInputElement.prototype, 'files', descriptor);
      }

      const onMessage = function (ev) {
        ev.stopImmediatePropagation();
        window.clearTimeout(timeoutId);

        patchFileInputProperty(ev.detail);
      };

      const timeoutId = window.setTimeout(function () {
        document.removeEventListener(eventName, onMessage, {
          capture: true,
          once: true
        });
      }, 10000); // 10 seconds

      document.addEventListener(eventName, onMessage, {
        capture: true,
        once: true
      });
    }

    const eventName = uuidv4();

    const script = document.createElement('script');
    script.textContent = `(${patchInput.toString()})("${eventName}")`;
    document.documentElement.appendChild(script);
    script.remove();

    document.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          selector,
          imageDataUrl: image.imageDataUrl,
          imageFilename: image.imageFilename,
          imageType: image.imageType
        }
      })
    );
  } else {
    const fileData = new File([image.imageBlob], image.imageFilename, {
      type: image.imageType
    });

    const data = new DataTransfer();
    data.items.add(fileData);

    input.files = data.files;
  }
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

async function sendReceipt(storageKeys) {
  if (storageKeys.length) {
    const keys = [...storageKeys];
    while (storageKeys.length) {
      storageKeys.pop();
    }

    await browser.runtime.sendMessage({
      id: 'storageReceipt',
      storageKeys: keys
    });
  }
}

async function initSearch(searchFn, engine, sessionKey) {
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
    const storageKeys = [sessionKey, session.imageKey];

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
        await searchFn({
          task: session.task,
          search: session.search,
          image,
          storageKeys
        });
      } else {
        await sendReceipt(storageKeys);

        showEngineError({errorId: 'error_sessionExpired', engine});
      }
    } catch (err) {
      await sendReceipt(storageKeys);

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
  getValidHostname,
  setFileInputData,
  showEngineError,
  uploadCallback,
  sendReceipt,
  initSearch
};
