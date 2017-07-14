const getText = browser.i18n.getMessage;

function onError(error) {
  console.log(`Error: ${error}`);
}

function createTab(url, index, active) {
  return browser.tabs.create({url: url, index: index, active: active});
}

function dataUriToBlob(dataUri) {
  var byteString;
  if (dataUri.split(',')[0].indexOf('base64') >= 0) {
    byteString = atob(dataUri.split(',')[1]);
  } else {
    byteString = unescape(dataUri.split(',')[1]);
  }

  var mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];

  var ia = new Uint8Array(byteString.length);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], {type: mimeString});
}

function executeCode(string, tabId, frameId = 0, runAt = 'document_start') {
  return browser.tabs.executeScript(tabId, {
    frameId: frameId,
    runAt: runAt,
    code: string
  });
}

function executeFile(file, tabId, frameId = 0, runAt = 'document_start') {
  return browser.tabs.executeScript(tabId, {
    frameId: frameId,
    runAt: runAt,
    file: file
  });
}

module.exports = {
  onError,
  getText,
  createTab,
  dataUriToBlob,
  executeCode,
  executeFile
};
