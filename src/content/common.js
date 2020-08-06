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

function validateUrl(url) {
  try {
    if (url.length > 2048) {
      return;
    }

    const parsedUrl = new URL(url);

    if (/^https?:$/i.test(parsedUrl.protocol)) {
      return true;
    }
  } catch (err) {}
}

function setFileInputData(input, blob, imgData) {
  const fileData = new File([blob], imgData.filename, {type: blob.type});

  const data = new DataTransfer();
  data.items.add(fileData);

  input.files = data.files;
}

function largeImageNotify(engine, maxSize) {
  chrome.runtime.sendMessage({
    id: 'notification',
    message: chrome.i18n.getMessage('error_invalidImageSize', [
      chrome.i18n.getMessage(`engineName_${engine}`),
      chrome.i18n.getMessage('unit_mb', maxSize)
    ]),
    type: `${engine}Error`
  });
}

function maxImageSize(engine) {
  if (['auDesign', 'nzTrademark'].includes(engine)) {
    return 20 * 1024 * 1024;
  }
  if (
    ['tineye', 'baidu', 'sogou', 'depositphotos', 'mailru'].includes(engine)
  ) {
    return 10 * 1024 * 1024;
  }
  if (['yandex', 'iqdb', 'auTrademark'].includes(engine)) {
    return 8 * 1024 * 1024;
  }
  if (
    [
      'ascii2d',
      'getty',
      'istock',
      'taobao',
      'alamy',
      '123rf',
      'jpDesign'
    ].includes(engine)
  ) {
    return 5 * 1024 * 1024;
  }
  if (['jingdong'].includes(engine)) {
    return 4 * 1024 * 1024;
  }
  if (
    [
      'qihoo',
      'alibabaChina',
      'esearch',
      'tmview',
      'branddb',
      'madridMonitor'
    ].includes(engine)
  ) {
    return 2 * 1024 * 1024;
  }

  return Infinity;
}

function findNode(
  selector,
  {timeout = 60000, throwError = true, observerOptions = null} = {}
) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) {
      resolve(el);
      return;
    }

    const observer = new MutationObserver(function (mutations, obs) {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        window.clearTimeout(timeoutId);
        resolve(el);
      }
    });

    const options = {
      childList: true,
      subtree: true
    };
    if (observerOptions) {
      Object.assign(options, observerOptions);
    }

    observer.observe(document, options);

    const timeoutId = window.setTimeout(function () {
      observer.disconnect();

      if (throwError) {
        reject(new Error(`DOM node not found: ${selector}`));
      } else {
        resolve();
      }
    }, timeout);
  });
}

function uploadCallback(xhr, callback, engine) {
  try {
    callback(xhr);
  } catch (err) {
    chrome.runtime.sendMessage({
      id: 'notification',
      message: chrome.i18n.getMessage(
        'error_engine',
        chrome.i18n.getMessage(`engineName_${engine}`)
      ),
      type: `${engine}Error`
    });

    console.log(err.toString());
    throw err;
  }
}

async function onMessage(request, uploadFunc, engine) {
  if (request.error) {
    if (request.error === 'sessionExpired') {
      chrome.runtime.sendMessage({
        id: 'notification',
        message: chrome.i18n.getMessage(
          'error_sessionExpired',
          chrome.i18n.getMessage(`engineName_${engine}`)
        ),
        type: `${engine}Error`
      });
    }
  } else {
    try {
      const params = {imgData: request.imgData};
      let error = false;
      if (params.imgData.isUpload[engine]) {
        const maxSize = maxImageSize(engine);

        if (params.imgData.size > maxSize) {
          largeImageNotify(engine, maxSize);
          error = true;
        } else {
          const rsp = await fetch(params.imgData.objectUrl);
          params.blob = await rsp.blob();
        }
      }

      if (!error) {
        await uploadFunc(params);
      }
    } catch (err) {
      chrome.runtime.sendMessage({
        id: 'notification',
        message: chrome.i18n.getMessage(
          'error_engine',
          chrome.i18n.getMessage(`engineName_${engine}`)
        ),
        type: `${engine}Error`
      });

      console.log(err.toString());
      throw err;
    } finally {
      chrome.runtime.sendMessage({
        id: 'dataReceipt',
        dataKey: request.imgData.dataKey
      });
    }
  }
}

function initUpload(upload, dataKey, engine) {
  chrome.runtime.onMessage.addListener(function (request, sender) {
    if (request.id === 'imageDataResponse') {
      onMessage(request, upload, engine);
    }
  });
  chrome.runtime.sendMessage({id: 'imageDataRequest', dataKey});
}
