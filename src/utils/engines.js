import browser from 'webextension-polyfill';
import {v4 as uuidv4} from 'uuid';

import {getMaxImageSize, getLargeImageMessage} from 'utils/app';
import {dataUrlToBlob} from 'utils/common';
import {targetEnv} from 'utils/config';

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

async function sendReceipt(storageIds) {
  if (storageIds.length) {
    const keys = [...storageIds];
    while (storageIds.length) {
      storageIds.pop();
    }

    await browser.runtime.sendMessage({
      id: 'storageReceipt',
      storageIds: keys
    });
  }
}

async function initSearch(searchFn, engine, taskId) {
  // Script may be injected multiple times
  if (typeof self.task === 'undefined') {
    self.task = null;
  } else {
    return;
  }

  self.task = await browser.runtime.sendMessage({
    id: 'storageRequest',
    asyncResponse: true,
    storageId: taskId
  });

  if (task) {
    const storageIds = [taskId, task.imageId];

    try {
      if (task.search.method === 'upload') {
        const maxSize = getMaxImageSize(engine);
        if (task.search.imageSize > maxSize) {
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
        storageId: task.imageId
      });

      if (image) {
        if (task.search.method === 'upload') {
          image.imageBlob = dataUrlToBlob(image.imageDataUrl);
        }
        await searchFn({
          session: task.session,
          search: task.search,
          image,
          storageIds
        });
      } else {
        await sendReceipt(storageIds);

        showEngineError({errorId: 'error_sessionExpired', engine});
      }
    } catch (err) {
      await sendReceipt(storageIds);

      showEngineError({errorId: 'error_engine', engine});

      console.log(err.toString());
      throw err;
    }
  } else {
    showEngineError({errorId: 'error_sessionExpired', engine});
  }
}

export {
  getValidHostname,
  setFileInputData,
  showEngineError,
  uploadCallback,
  sendReceipt,
  initSearch
};
