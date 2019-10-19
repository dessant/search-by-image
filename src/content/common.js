function getXHR() {
  try {
    return new content.XMLHttpRequest();
  } catch (err) {
    try {
      // Firefox <= 57
      return XPCNativeWrapper(new window.wrappedJSObject.XMLHttpRequest());
    } catch (err) {
      return new XMLHttpRequest();
    }
  }
}

function getValidHostname(validHostnames, engine) {
  const hostname = window.location.hostname;
  if (!validHostnames.includes(hostname)) {
    throw new Error(`Invalid ${engine} hostname: ${hostname}`);
  }
  return hostname;
}

function setFileInputData(input, fileData, engine) {
  try {
    const data = new ClipboardEvent('').clipboardData || new DataTransfer();
    data.items.add(fileData);
    input.files = data.files;
  } catch (err) {
    console.log(err.toString());
    chrome.runtime.sendMessage({
      id: 'notification',
      message: chrome.i18n.getMessage(
        'error_formUpload',
        chrome.i18n.getMessage(`engineName_${engine}`)
      ),
      type: `${engine}Error`
    });
    throw err;
  }
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

function waitForElement(selector, timeout = 6000) {
  return new Promise(resolve => {
    const el = document.querySelector(selector);
    if (el) {
      resolve(el);
      return;
    }

    const observer = new MutationObserver(function(mutations, obs) {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        window.clearTimeout(timeoutId);
        resolve(el);
      }
    });

    observer.observe(document, {
      childList: true,
      subtree: true
    });

    const timeoutId = window.setTimeout(function() {
      observer.disconnect();
      resolve();
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
    throw err;
  }
}

async function onMessage(request, uploadFunc, engine) {
  if (request.id === 'imageDataResponse') {
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
          const size = params.imgData.size;
          if (
            ['tineye', 'baidu', 'sogou', 'depositphotos', 'mailru'].includes(
              engine
            ) &&
            size > 10 * 1024 * 1024
          ) {
            largeImageNotify(engine, '10');
            error = true;
          }
          if (['yandex', 'iqdb'].includes(engine) && size > 8 * 1024 * 1024) {
            largeImageNotify(engine, '8');
            error = true;
          }
          if (
            ['ascii2d', 'getty', 'istock', 'taobao'].includes(engine) &&
            size > 5 * 1024 * 1024
          ) {
            largeImageNotify(engine, '5');
            error = true;
          }
          if (engine === 'jingdong' && size > 4 * 1024 * 1024) {
            largeImageNotify(engine, '4');
            error = true;
          }
          if (
            ['qihoo', 'alibabaChina'].includes(engine) &&
            size > 2 * 1024 * 1024
          ) {
            largeImageNotify(engine, '2');
            error = true;
          }

          if (!error) {
            const rsp = await fetch(params.imgData.objectUrl);
            params.blob = await rsp.blob();
          }

          chrome.runtime.sendMessage({
            id: 'dataReceipt',
            dataKey: params.imgData.dataKey
          });
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
        throw err;
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
