import {validateUrl} from 'utils/app';
import {initSearch, prepareImageForUpload, sendReceipt} from 'utils/engines';

const engine = '123rf';

async function search({session, search, image, storageIds}) {
  image = await prepareImageForUpload({
    image,
    engine,
    target: 'api'
  });

  const data = new FormData();
  data.append('image_base64', image.imageDataUrl);

  const rsp = await fetch(
    'https://www.123rf.com/apicore/search/reverse/upload',
    {
      mode: 'cors',
      method: 'POST',
      body: data
    }
  );

  if (rsp.status !== 200) {
    throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
  }

  const rspText = await rsp.text();

  // JSON response may start with HTML
  const searchData = JSON.parse(rspText.substring(rspText.indexOf('{')));

  const tabUrl =
    'https://www.123rf.com/reverse-search/?fid=' + searchData.data.fid;

  await sendReceipt(storageIds);

  if (validateUrl(tabUrl)) {
    window.location.replace(tabUrl);
  }
}

function init() {
  initSearch(search, engine, taskId);
}

init();
