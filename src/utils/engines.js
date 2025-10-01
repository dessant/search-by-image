import {v4 as uuidv4} from 'uuid';

import {
  convertProcessedImage,
  getMaxImageUploadSize,
  getLargeImageMessage,
  sendLargeMessage
} from 'utils/app';
import {
  getText,
  dataUrlToBlob,
  waitForDocumentLoad,
  makeDocumentVisible,
  executeScriptMainContext
} from 'utils/common';
import {chromeSbiSrc} from 'utils/data';

function getValidHostname({validHostnames = null} = {}) {
  const hostname = window.location.hostname;
  if (validHostnames && !validHostnames.includes(hostname)) {
    throw new Error(`Invalid hostname: ${hostname}`);
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
    const eventName = uuidv4();

    await executeScriptMainContext({
      func: 'setFileInputData',
      args: [eventName]
    });

    document.dispatchEvent(
      new CustomEvent(eventName, {
        detail: JSON.stringify({
          selector,
          imageDataUrl: image.imageDataUrl,
          imageFilename: image.imageFilename,
          imageType: image.imageType
        })
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

async function unsetUserAgent(storageIds) {
  await browser.runtime.sendMessage({
    id: 'unsetTabUserAgent',
    tabSetupDataId: storageIds[2]
  });
}

function showEngineError({message, errorId, engine}) {
  if (!message) {
    message = getText(errorId, getText(`engineName_${engine}`));
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

async function initSearch(
  searchFn,
  engine,
  taskId,
  {engineAccess = null, documentVisible = false} = {}
) {
  if (documentVisible) {
    makeDocumentVisible();
  }

  await waitForDocumentLoad();

  if (engineAccess && !(await engineAccess())) {
    return;
  }

  const task = await browser.runtime.sendMessage({
    id: 'storageRequest',
    asyncResponse: true,
    storageId: taskId
  });

  if (task) {
    const storageIds = [taskId, task.imageId, task.tabSetupDataId];

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

async function searchGoogleImages({session, search, image} = {}) {
  const data = new FormData();
  data.append('encoded_image', image.imageBlob, image.imageFilename);
  data.append('image_url', '');
  data.append('sbisrc', chromeSbiSrc);

  const rsp = await fetch('https://www.google.com/searchbyimage/upload', {
    referrer: '',
    mode: 'cors',
    method: 'POST',
    body: data
  });

  let tabUrl;

  if (rsp.status === 200) {
    tabUrl = rsp.url;
  } else if (image.imageUrl) {
    // fall back to searching with image URL

    tabUrl =
      'https:www.google.com/searchbyimage?sbisrc=cr_1_5_2&image_url=' +
      encodeURIComponent(image.imageUrl);
  } else {
    throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
  }

  if (!session.options.localGoogle) {
    tabUrl = tabUrl.replace(
      /(.*google\.)[a-zA-Z0-9_\-.]+(\/.*)/,
      '$1com$2&gws_rd=cr&gl=US'
    );
  }

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
  unsetUserAgent,
  showEngineError,
  uploadCallback,
  sendReceipt,
  initSearch,
  searchGoogleImages,
  searchPinterest,
  EngineError,
  prepareImageForUpload
};
