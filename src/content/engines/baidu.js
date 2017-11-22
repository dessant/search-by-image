function showResults(xhr) {
  if (xhr.status === 413) {
    largeImageNotify('baidu', '10');
    return;
  }

  const rsp = JSON.parse(xhr.responseText);
  const url =
    `http://image.baidu.com/pcdutu?queryImageUrl=${rsp.url}` +
    `&querySign=${rsp.querySign}&fm=index&uptype=upload_pc` +
    `&result=result_camera`;

  window.location.replace(url);
}

async function upload({blob, imgData}) {
  const url =
    'http://image.baidu.com/pcdutu/a_upload?fr=html5' +
    '&target=pcSearchImage&needJson=true';
  const data = new FormData();
  data.append('file', blob, imgData.filename);
  data.append('pos', 'upload');
  data.append('uptype', 'upload_pc');
  data.append('fm', 'index');

  const xhr = getXHR();
  xhr.addEventListener('load', function() {
    uploadCallback(this, showResults, 'baidu');
  });
  xhr.open('POST', url);
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  xhr.send(data);
}

initUpload(upload, dataKey, 'baidu');
