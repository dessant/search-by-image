function getXHR() {
  try {
    return XPCNativeWrapper(new window.wrappedJSObject.XMLHttpRequest());
  } catch (e) {
    return new XMLHttpRequest();
  }
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
        if (request.imgData.isBlob) {
          const rsp = await fetch(request.imgData.objectUrl);
          params.blob = await rsp.blob();
          chrome.runtime.sendMessage({
            id: 'imageUploadReceipt',
            receiptKey: request.imgData.receiptKey
          });
        }
        await uploadFunc(params);
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
