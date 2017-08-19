function showResults() {
  window.location.replace(this.responseURL);
}

async function upload(dataUri) {
  const blob = dataUriToBlob(dataUri);
  let subtype = blob.type.split('/')[1];
  if (subtype === 'x-icon') {
    subtype = 'ico';
  }
  const filename = `${Math.random().toString(36).substring(7)}.${subtype}`;

  const data = new FormData();
  data.append('flag', '1');
  data.append('pic_path', blob, filename);

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
