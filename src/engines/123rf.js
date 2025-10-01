import {validateUrl} from 'utils/app';
import {runOnce} from 'utils/common';
import {
  initSearch,
  prepareImageForUpload,
  sendReceipt,
  getValidHostname
} from 'utils/engines';

const engine = '123rf';

async function search({session, search, image, storageIds} = {}) {
  image = await prepareImageForUpload({
    image,
    engine,
    target: 'api'
  });

  const data = new FormData();
  data.append('image_base64', image.imageDataUrl);

  const apiHost = getValidHostname();

  const rsp = await fetch(`https://${apiHost}/apicore/search/reverse/upload`, {
    mode: 'cors',
    method: 'POST',
    body: data
  });

  if (rsp.status !== 200) {
    throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
  }

  const rspText = await rsp.text();

  // JSON response may start with HTML
  const searchData = JSON.parse(rspText.substring(rspText.indexOf('{')));

  const tabUrl = `https://${apiHost}/reverse-search/?fid=${searchData.data.fid}`;

  await sendReceipt(storageIds);

  if (validateUrl(tabUrl)) {
    window.location.replace(tabUrl);
  }
}

async function engineAccess() {
  if (document.querySelector('h1')?.textContent.toLowerCase() === '403 error') {
    return false;
  }

  return true;
}

function init() {
  initSearch(search, engine, taskId, {engineAccess});
}

if (runOnce('search')) {
  init();
}
