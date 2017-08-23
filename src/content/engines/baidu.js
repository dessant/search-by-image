function showResults() {
  const rsp = JSON.parse(this.responseText);
  if (rsp.errno !== 0) {
    return;
  }
  const url = `http://image.baidu.com/pcdutu?queryImageUrl=${rsp.url}&querySign=${rsp.querySign}&fm=index&uptype=upload_pc&result=result_camera`;

  window.location.replace(url);
}

async function upload(dataUri) {
  const url =
    'http://image.baidu.com/pcdutu/a_upload?fr=html5&target=pcSearchImage&needJson=true';
  const blob = dataUriToBlob(dataUri);
  let subtype = blob.type.split('/')[1];
  if (subtype === 'x-icon') {
    subtype = 'ico';
  }
  const filename = getRandomFilename(subtype);

  const data = new FormData();
  data.append('file', blob, filename);
  data.append('pos', 'upload');
  data.append('uptype', 'upload_pc');
  data.append('fm', 'index');

  const xhr = getXHR();
  xhr.addEventListener('load', showResults);
  xhr.open('POST', url);
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
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
