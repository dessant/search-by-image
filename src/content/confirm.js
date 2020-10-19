function messageConfirmFrame(message) {
  if (frameStore.data.confirmFrameId) {
    chrome.runtime.sendMessage({
      id: 'routeMessage',
      frameId: frameStore.data.confirmFrameId,
      data: message
    });
  } else {
    confirmFrame.queuedMessage = message;
  }
}

function showConfirmFrame() {
  confirmFrame.classList.remove('sbi-frame-hidden');
}

function hideConfirmFrame(delay = 300) {
  window.setTimeout(function () {
    confirmFrame.classList.add('sbi-frame-hidden');
    document.body.focus();
  }, delay);
}

function onConfirmMessage(request, sender) {
  if (request.id === 'imageConfirmationOpen') {
    messageConfirmFrame({
      id: request.id,
      engine: request.engine,
      images: request.images
    });
    showConfirmFrame();
    return;
  }

  if (request.id === 'imageConfirmationClose') {
    if (request.hasOwnProperty('messageFrame') && request.messageFrame) {
      messageConfirmFrame({id: request.id});
    }
    hideConfirmFrame();
    return;
  }

  if (request.id === 'confirmFrameId') {
    if (!frameStore.data.confirmFrameId) {
      frameStore.data.confirmFrameId = request.frameId;
      if (confirmFrame.queuedMessage) {
        messageConfirmFrame(confirmFrame.queuedMessage);
        confirmFrame.queuedMessage = null;
      }
    }
    return;
  }
}

chrome.runtime.onMessage.addListener(onConfirmMessage);

const confirmFrame = document.createElement('iframe');
confirmFrame.setAttribute('data-c45ng3u9', '');
confirmFrame.classList.add('sbi-frame-hidden');
confirmFrame.id = 'sbi-confirm-frame';
confirmFrame.queuedMessage = null;
confirmFrame.src = chrome.extension.getURL('/src/confirm/index.html');
document.body.appendChild(confirmFrame);

null;
