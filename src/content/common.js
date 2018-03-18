function getXHR() {
  try {
    return XPCNativeWrapper(new window.wrappedJSObject.XMLHttpRequest());
  } catch (e) {
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

function uploadCallback(xhr, callback, engine) {
  try {
    callback(xhr);
  } catch (e) {
    chrome.runtime.sendMessage({
      id: 'notification',
      message: chrome.i18n.getMessage(
        'error_engine',
        chrome.i18n.getMessage(`engineName_${engine}`)
      ),
      type: `${engine}Error`
    });
    throw e;
  }
}

async function onMessage(request, uploadFunc, engine) {
  if (request.id === 'imageDataResponse') {
    if (request.hasOwnProperty('error')) {
      if (error === 'sessionExpired') {
        chrome.runtime.sendMessage({
          id: 'notification',
          message: hrome.i18n.getMessage(
            'error_sessionExpired',
            chrome.i18n.getMessage(`engineName_${engine}`)
          ),
          type: `${engine}Error`
        });
      }
    } else {
      try {
        const params = {imgData: request.imgData};
        let getImage = true;
        if (request.imgData.isBlob) {
          const size = request.imgData.size;
          if (['baidu', 'sogou'].includes(engine) && size > 10 * 1024 * 1024) {
            largeImageNotify(engine, '10');
            getImage = false;
          }
          if (['yandex', 'iqdb'].includes(engine) && size > 8 * 1024 * 1024) {
            largeImageNotify(engine, '8');
            getImage = false;
          }
          if (engine === 'ascii2d' && size > 5 * 1024 * 1024) {
            largeImageNotify(engine, '5');
            getImage = false;
          }

          if (getImage) {
            const rsp = await fetch(request.imgData.objectUrl);
            params.blob = await rsp.blob();
          }

          chrome.runtime.sendMessage({
            id: 'imageUploadReceipt',
            receiptKey: request.imgData.receiptKey
          });
        }
        if (getImage) {
          await uploadFunc(params);
        }
      } catch (e) {
        chrome.runtime.sendMessage({
          id: 'notification',
          message: chrome.i18n.getMessage(
            'error_engine',
            chrome.i18n.getMessage(`engineName_${engine}`)
          ),
          type: `${engine}Error`
        });
        throw e;
      }
    }
  }
}

function initUpload(upload, dataKey, engine) {
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    onMessage(request, upload, engine);
  });
  chrome.runtime.sendMessage({id: 'imageDataRequest', dataKey});
}
