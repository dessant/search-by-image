function messageSelectFrame(message) {
  if (frameStore.data.selectFrameId) {
    chrome.runtime.sendMessage({
      id: 'routeMessage',
      frameId: frameStore.data.selectFrameId,
      data: message
    });
  } else {
    selectFrame.queuedMessage = message;
  }
}

function showSelectFrame() {
  selectFrame.classList.remove('sbi-frame-hidden');
}

function hideSelectFrame(delay = 300) {
  window.setTimeout(function() {
    selectFrame.classList.add('sbi-frame-hidden');
    document.body.focus();
  }, delay);
}

function onSelectMessage(request, sender, sendResponse) {
  if (request.id === 'imageSelectionOpen') {
    messageSelectFrame({id: request.id});
    showSelectFrame();
    return;
  }

  if (request.id === 'imageSelectionClose') {
    if (request.hasOwnProperty('messageFrame') && request.messageFrame) {
      messageSelectFrame({id: request.id});
    }
    hideSelectFrame();
    return;
  }

  if (request.id === 'selectFrameId') {
    if (!frameStore.data.selectFrameId) {
      frameStore.data.selectFrameId = request.frameId;
      if (selectFrame.queuedMessage) {
        messageSelectFrame(selectFrame.queuedMessage);
        selectFrame.queuedMessage = null;
      }
    }
    return;
  }
}

chrome.runtime.onMessage.addListener(onSelectMessage);

const selectFrame = document.createElement('iframe');
selectFrame.setAttribute('data-c45ng3u9', '');
selectFrame.classList.add('sbi-frame-hidden');
selectFrame.id = 'sbi-select-frame';
selectFrame.queuedMessage = null;
selectFrame.src = chrome.extension.getURL('/src/select/index.html');
document.body.appendChild(selectFrame);

null;
