function showResults() {
  window.location.replace(this.responseURL);
}

async function upload(dataUri) {
  const data = new FormData();
  data.append('flag', '1');
  data.append(
    'pic_path',
    dataUriToBlob(dataUri.data),
    dataUri.info.fullFilename
  );

  const xhr = getXHR();
  xhr.addEventListener('load', showResults);
  xhr.open('POST', 'http://pic.sogou.com/ris_upload');
  xhr.send(data);
}

function onMessage(request, sender, sendResponse) {
  if (request.id === 'dataUriResponse') {
    if (request.hasOwnProperty('error')) {
      console.log(request.error);
    } else {
      upload(request.dataUri);
    }
  }
}

browser.runtime.onMessage.addListener(onMessage);
browser.runtime.sendMessage({id: 'dataUriRequest', dataKey: dataKey});
