function gcd(a, b) {
  return b == 0 ? a : gcd(b, a % b);
}

function showResults() {
  const match = /(?:.*&)?cbir_id=([^&]*)(?:&.*)?/.exec(
    JSON.parse(this.responseText).blocks[0].params.url
  );
  if (match) {
    window.location.replace(
      `https://yandex.com/images/search?cbir_id=${match[1]}&rpt=imageview&from=`
    );
  }
}

async function upload(dataUri) {
  const sw = screen.width;
  const sh = screen.height;
  const r = gcd(sw, sh);
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  const pd = String(window.devicePixelRatio).replace('.', '_');
  const uinfo = `sw-${sw}-sh-${sh}-ww-${ww}-wh-${wh}-pd-${pd}-wp-${sw /
    r}x${sh / r}_${sw}x${sh}`;
  const serpid = JSON.parse(document.querySelector('body').dataset.bem)[
    'i-global'
  ].serpid;

  const url = `https://yandex.com/images/search?serpid=${serpid}&uinfo=${uinfo}&rpt=imageview&format=json&request={"blocks":[{"block":"b-page_type_search-by-image__link"}]}`;

  const data = new FormData();
  data.append('upfile', dataUriToBlob(dataUri.data), dataUri.info.fullFilename);

  const xhr = getXHR();
  xhr.addEventListener('load', showResults);
  xhr.open('POST', url);
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  xhr.setRequestHeader(
    'Accept',
    'application/json, text/javascript, */*; q=0.01'
  );
  xhr.send(data);
}

chrome.runtime.onMessage.addListener(request => {
  onDataUriResponse(request, upload);
});
chrome.runtime.sendMessage({id: 'dataUriRequest', dataKey: dataKey});
