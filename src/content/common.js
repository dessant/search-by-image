function getXHR() {
  try {
    return new content.XMLHttpRequest();
  } catch (e) {
    try {
      // Firefox <= 57
      return XPCNativeWrapper(new window.wrappedJSObject.XMLHttpRequest());
    } catch (e) {
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
        let getImage = true;
        if (request.imgData.objectUrl) {
          const size = request.imgData.size;
          if (
            ['baidu', 'sogou', 'depositphotos'].includes(engine) &&
            size > 10 * 1024 * 1024
          ) {
            largeImageNotify(engine, '10');
            getImage = false;
          }
          if (['yandex', 'iqdb'].includes(engine) && size > 8 * 1024 * 1024) {
            largeImageNotify(engine, '8');
            getImage = false;
          }
          if (
            ['ascii2d', 'getty', 'istock'].includes(engine) &&
            size > 5 * 1024 * 1024
          ) {
            largeImageNotify(engine, '5');
            getImage = false;
          }

          if (getImage) {
            const rsp = await fetch(request.imgData.objectUrl);
            params.blob = await rsp.blob();
          }

          chrome.runtime.sendMessage({
            id: 'dataReceipt',
            dataKey: request.imgData.dataKey
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
