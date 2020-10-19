function messageCaptureFrame(message) {
  if (frameStore.data.captureFrameId) {
    chrome.runtime.sendMessage({
      id: 'routeMessage',
      frameId: frameStore.data.captureFrameId,
      data: message
    });
  } else {
    captureFrame.queuedMessage = message;
  }
}

function showCaptureFrame() {
  captureFrame.classList.remove('sbi-frame-hidden');
}

function hideCaptureFrame(delay = 300) {
  window.setTimeout(function () {
    captureFrame.classList.add('sbi-frame-hidden');
    document.body.focus();
  }, delay);
}

function onCaptureMessage(request, sender) {
  if (request.id === 'imageCaptureOpen') {
    messageCaptureFrame({id: request.id, engine: request.engine});
    showCaptureFrame();
    return;
  }

  if (request.id === 'imageCaptureClose') {
    if (request.hasOwnProperty('messageFrame') && request.messageFrame) {
      messageCaptureFrame({id: request.id});
    }
    hideCaptureFrame();
    return;
  }

  if (request.id === 'captureFrameId') {
    if (!frameStore.data.captureFrameId) {
      frameStore.data.captureFrameId = request.frameId;
      if (captureFrame.queuedMessage) {
        messageCaptureFrame(captureFrame.queuedMessage);
        captureFrame.queuedMessage = null;
      }
    }
    return;
  }
}

chrome.runtime.onMessage.addListener(onCaptureMessage);

const captureFrame = document.createElement('iframe');
captureFrame.setAttribute('data-c45ng3u9', '');
captureFrame.classList.add('sbi-frame-hidden');
captureFrame.id = 'sbi-capture-frame';
captureFrame.queuedMessage = null;
captureFrame.src = chrome.extension.getURL('/src/capture/index.html');
document.body.appendChild(captureFrame);

null;
