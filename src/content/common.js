function getXHR() {
  try {
    return XPCNativeWrapper(new window.wrappedJSObject.XMLHttpRequest());
  } catch (e) {
    return new XMLHttpRequest();
  }
}

async function onMessage(request, uploadFunc) {
  if (request.id === 'imageDataResponse') {
    if (request.hasOwnProperty('error')) {
      chrome.runtime.sendMessage({
        id: 'notification',
        messageId: request.error
      });
    } else {
      try {
        const params = {imgData: request.imgData};
        if (request.imgData.isBlob) {
          const rsp = await fetch(request.imgData.objectUrl);
          params.blob = await rsp.blob();
        }
        if (request.imgData.receiptKey) {
          chrome.runtime.sendMessage({
            id: 'imageUploadReceipt',
            receiptKey: request.imgData.receiptKey
          });
        }
        await uploadFunc(params);
      } catch (e) {
        console.error(e);
        chrome.runtime.sendMessage({
          id: 'notification',
          messageId: 'error_internalError'
        });
      }
    }
  }
}

function initUpload(upload, dataKey) {
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    onMessage(request, upload);
  });
  chrome.runtime.sendMessage({id: 'imageDataRequest', dataKey});
}
