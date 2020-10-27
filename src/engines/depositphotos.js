import {validateUrl} from 'utils/app';
import {getXHR, uploadCallback, initUpload} from 'utils/engines';

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

async function upload({task, search, image}) {
  const url = 'https://msis.depositphotos.com/search';

  const data = new FormData();
  data.append('file', image.imageBlob, image.imageFilename);

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

function init() {
  initUpload(upload, engine, sessionKey);
}

init();
