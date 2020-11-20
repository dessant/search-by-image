import {validateUrl} from 'utils/app';
import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';
import {targetEnv} from 'utils/config';

const engine = '123rf';

async function search({task, search, image, storageKeys}) {
  if (targetEnv === 'safari') {
    const data = new FormData();
    data.append('file_upload', image.imageBlob, image.imageFilename);
    data.append('btn_submit', 'Search by image');

    const rsp = await fetch('https://www.123rf.com/reversesearch/', {
      mode: 'cors',
      method: 'POST',
      body: data
    });

    if (rsp.status !== 200) {
      throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
    }

    const tabUrl = rsp.url;

    await sendReceipt(storageKeys);

    if (validateUrl(tabUrl)) {
      window.location.replace(tabUrl);
    }
  } else {
    (await findNode('#cam_sim')).click();

    const inputSelector = '#file_upload';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageKeys);

    (await findNode('#btn_submit2')).click();
  }
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();
