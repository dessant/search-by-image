const engine = 'depositphotos';

function showResults(xhr) {
  if (xhr.status !== 200) {
    throw new Error('bad response');
  }

  const results = JSON.parse(xhr.responseText).data.items;
  const ids = encodeURIComponent(results.map(item => item.id).join(','));

  const tabUrl = `https://depositphotos.com/search/by-images.html?idList=[${ids}]`;

  if (validateUrl(tabUrl)) {
    window.location.replace(tabUrl);
  }
}

async function upload({blob, imgData}) {
  const url = 'https://msis.depositphotos.com/search';

  const data = new FormData();
  data.append('file', blob, imgData.filename);

  const xhr = getXHR();
  xhr.addEventListener('load', function () {
    uploadCallback(this, showResults, engine);
  });
  xhr.open('POST', url);
  xhr.setRequestHeader(
    'Accept',
    'application/json, text/javascript, */*; q=0.01'
  );
  xhr.send(data);
}

initUpload(upload, dataKey, engine);
