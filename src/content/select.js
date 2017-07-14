function postFrameMessage(message) {
  dialogFrame.classList.remove('sbi-dialog-frame-hidden');
  dialogFrame.contentDocument.body.focus();
  dialogFrame.contentWindow.postMessage(message, dialogFrame.src);
}

function onFrameLoad() {
  dialogFrame.isLoaded = true;
  if (dialogFrame.extMessage) {
    postFrameMessage(dialogFrame.extMessage);
    dialogFrame.extMessage = null;
  }
}

function onExtMessage(request, sender, sendResponse) {
  if (request.id === 'imageSelectionDialogUpdate') {
    const message = {
      id: request.id,
      imgUrls: request.imgUrls,
      menuItemId: request.menuItemId
    };
    if (dialogFrame.isLoaded) {
      postFrameMessage(message);
    } else {
      dialogFrame.extMessage = message;
    }
  }
}

function onMessage(e) {
  if (e.source !== dialogFrame.contentWindow) {
    return;
  }
  if (e.data.id === 'imageSelectionDialogClose') {
    window.setTimeout(function() {
      dialogFrame.classList.add('sbi-dialog-frame-hidden');
      document.body.focus();
    }, 300);
  }
}

browser.runtime.onMessage.addListener(onExtMessage);
window.addEventListener('message', onMessage);

const dialogFrame = document.createElement('iframe');
dialogFrame.setAttribute('data-c45ng3u9', '');
dialogFrame.classList.add('sbi-dialog-frame-hidden');
dialogFrame.id = 'sbi-dialog-frame';
dialogFrame.extMessage = null;
dialogFrame.isLoaded = false;
dialogFrame.addEventListener('load', onFrameLoad);
dialogFrame.src = browser.extension.getURL('/src/select/index.html');
document.body.appendChild(dialogFrame);

null;
