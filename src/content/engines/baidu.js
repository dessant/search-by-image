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
  const data = new FormData();
  data.append('file', dataUriToBlob(dataUri.data), dataUri.info.fullFilename);
  data.append('pos', 'upload');
  data.append('uptype', 'upload_pc');
  data.append('fm', 'index');

  const xhr = getXHR();
  xhr.addEventListener('load', showResults);
  xhr.open('POST', url);
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  xhr.send(data);
}

initUpload(upload, dataKey);
