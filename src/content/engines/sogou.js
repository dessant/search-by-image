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

chrome.runtime.onMessage.addListener(request => {
  onDataUriResponse(request, upload);
});
chrome.runtime.sendMessage({id: 'dataUriRequest', dataKey: dataKey});
