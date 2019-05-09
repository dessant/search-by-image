function getHostname() {
  const hostnames = [
    'yandex.com',
    'yandex.ru',
    'yandex.ua',
    'yandex.by',
    'yandex.kz',
    'yandex.uz',
    'yandex.com.tr'
  ];
  return getValidHostname(hostnames, 'yandex');
}

function showResults(xhr) {
  if (xhr.status === 413) {
    largeImageNotify('yandex', '8');
    return;
  }

  const params = JSON.parse(xhr.responseText).blocks[0].params.url;
  window.location.replace(`https://${getHostname()}/images/search?${params}`);
}

async function upload({blob, imgData}) {
  const hostname = getHostname();
  const url =
    `https://${hostname}/images/touch/search?rpt=imageview&format=json` +
    `&request={"blocks":[{"block":"cbir-uploader__get-cbir-id"}]}`;

  const data = new FormData();
  data.append('upfile', blob);

  const xhr = getXHR();
  xhr.addEventListener('load', function() {
    uploadCallback(this, showResults, 'yandex');
  });
  xhr.open('POST', url);
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  xhr.setRequestHeader(
    'Accept',
    'application/json, text/javascript, */*; q=0.01'
  );
  xhr.send(data);
}

initUpload(upload, dataKey, 'yandex');
