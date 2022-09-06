import {v4 as uuidv4} from 'uuid';

import {
  convertProcessedImage,
  getMaxImageUploadSize,
  getLargeImageMessage,
  sendLargeMessage
} from 'utils/app';
import {dataUrlToBlob} from 'utils/common';

function getValidHostname(validHostnames, engine) {
  const hostname = window.location.hostname;
  if (!validHostnames.includes(hostname)) {
    throw new Error(`Invalid ${engine} hostname: ${hostname}`);
  }
  return hostname;
}

async function setFileInputData(
  selector,
  input,
  image,
  {patchInput = false} = {}
) {
  if (patchInput) {
    function patch(eventName) {
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
    script.textContent = `(${patch.toString()})("${eventName}")`;
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

    const dt = new DataTransfer();
    dt.items.add(fileData);

    input.files = dt.files;
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
  // Script may be injected multiple times.
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
      let image = await sendLargeMessage({
        message: {
          id: 'storageRequest',
          asyncResponse: true,
          storageId: task.imageId
        },
        transferResponse: true
      });

      if (image) {
        if (task.search.assetType === 'image') {
          image = await prepareImageForUpload({image, engine});
        }

        await searchFn({
          session: task.session,
          search: task.search,
          image,
          storageIds
        });
      } else {
        await sendReceipt(storageIds);

        showEngineError({errorId: 'error_sessionExpiredEngine', engine});
      }
    } catch (err) {
      await sendReceipt(storageIds);

      const params = {engine};
      if (err.name === 'EngineError') {
        params.message = err.message;
      } else {
        params.errorId = 'error_engine';
      }

      showEngineError(params);

      console.log(err.toString());
      throw err;
    }
  } else {
    showEngineError({errorId: 'error_sessionExpiredEngine', engine});
  }
}

async function searchGoogle({session, search, image} = {}) {
  const data = new FormData();
  data.append('encoded_image', image.imageBlob, image.imageFilename);
  const rsp = await fetch('https://www.google.com/searchbyimage/upload', {
    referrer: '',
    mode: 'cors',
    method: 'POST',
    body: data
  });

  if (rsp.status !== 200) {
    throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
  }

  let tabUrl = rsp.url;

  if (!session.options.localGoogle) {
    tabUrl = tabUrl.replace(
      /(.*google\.)[a-zA-Z0-9_\-.]+(\/.*)/,
      '$1com$2&gl=US'
    );
  }

  return tabUrl;
}

async function searchGoogleLens({session, search, image} = {}) {
  const data = new FormData();
  data.append('encoded_image', image.imageBlob, image.imageFilename);

  const rsp = await fetch(
    `https://lens.google.com/upload?ep=ccm&s=&st=${Date.now()}`,
    {
      referrer: '',
      mode: 'cors',
      method: 'POST',
      body: data
    }
  );

  if (rsp.status !== 200) {
    throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
  }

  const response = await rsp.text();

  const tabUrl = response.match(/<meta .*URL=(https?:\/\/.*)"/)[1];

  return tabUrl;
}

async function searchPinterest({session, search, image} = {}) {
  const data = new FormData();
  data.append('image', image.imageBlob, image.imageFilename);
  data.append('x', '0');
  data.append('y', '0');
  data.append('w', '1');
  data.append('h', '1');
  data.append('base_scheme', 'https');
  const rsp = await fetch(
    'https://api.pinterest.com/v3/visual_search/extension/image/',
    {
      referrer: '',
      mode: 'cors',
      method: 'PUT',
      body: data
    }
  );

  const response = await rsp.json();

  if (
    rsp.status !== 200 ||
    response.status !== 'success' ||
    !response.data ||
    !response.data.length
  ) {
    throw new Error('search failed');
  }

  const results = response.data.map(item => ({
    page: `https://pinterest.com/pin/${item.id}/`,
    image: item.image_large_url,
    text: item.description
  }));

  return results;
}

class EngineError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EngineError';
  }
}

async function prepareImageForUpload({
  image,
  engine,
  target,
  newType = '',
  setBlob = true
} = {}) {
  const maxSize = getMaxImageUploadSize(engine, {target});

  if (maxSize) {
    if (image.imageSize > maxSize) {
      image = await convertProcessedImage(image, {newType, maxSize, setBlob});

      if (!image) {
        throw new EngineError(getLargeImageMessage(engine, maxSize));
      }
    } else {
      if (setBlob) {
        image.imageBlob = dataUrlToBlob(image.imageDataUrl);
      }
    }
  }

  return image;
}

export {
  getValidHostname,
  setFileInputData,
  showEngineError,
  uploadCallback,
  sendReceipt,
  initSearch,
  searchGoogle,
  searchGoogleLens,
  searchPinterest,
  EngineError,
  prepareImageForUpload
};
