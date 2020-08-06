const engine = 'yandex';

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
  return getValidHostname(hostnames, engine);
}

function showResults(xhr) {
  if (xhr.status === 413) {
    largeImageNotify(engine, '8');
    return;
  }

  const params = JSON.parse(xhr.responseText).blocks[0].params.url;
  const tabUrl = `https://${getHostname()}/images/search?${params}`;

  if (validateUrl(tabUrl)) {
    window.location.replace(tabUrl);
  }
}

async function upload({blob, imgData}) {
  if (
    document.head.querySelector('meta[name="apple-mobile-web-app-capable"]')
  ) {
    const hostname = getHostname();
    const url =
      `https://${hostname}/images/touch/search?rpt=imageview&format=json` +
      `&request={"blocks":[{"block":"cbir-uploader__get-cbir-id"}]}`;

    const data = new FormData();
    data.append('upfile', blob);

    const xhr = getXHR();
    xhr.addEventListener('load', function () {
      uploadCallback(this, showResults, engine);
    });
    xhr.open('POST', url);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader(
      'Accept',
      'application/json, text/javascript, */*; q=0.01'
    );
    xhr.send(data);
  } else {
    (await findNode('.input__cbir-button button')).click();

    const input = await findNode('.cbir-panel__file-input');

    setFileInputData(input, blob, imgData);

    input.dispatchEvent(new Event('change'));
  }
}

initUpload(upload, dataKey, engine);
