function showResults(xhr) {
  window.location.replace(xhr.responseURL);
}

async function upload({blob, imgData}) {
  const data = new FormData();
  data.append('flag', '1');
  data.append('pic_path', blob, imgData.filename);

  const xhr = getXHR();
  xhr.addEventListener('load', function() {
    uploadCallback(this, showResults, 'sogou');
  });
  xhr.open('POST', 'http://pic.sogou.com/ris_upload');
  xhr.send(data);
}

initUpload(upload, dataKey, 'sogou');
