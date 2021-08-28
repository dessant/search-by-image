import {validateUrl} from 'utils/app';
import {findNode, isAndroid} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';
import {targetEnv} from 'utils/config';

const engine = '123rf';

async function search({session, search, image, storageIds}) {
  if ((await isAndroid()) || targetEnv === 'safari') {
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

    await sendReceipt(storageIds);

    if (validateUrl(tabUrl)) {
      window.location.replace(tabUrl);
    }
  } else {
    (await findNode('#Main-Searchbar-reverseSearch-btn')).click();

    const inputSelector = '#searchbar-draganddrop-input';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change', {bubbles: true}));

    await findNode('.DragAndDrop__previewImage');

    window.setTimeout(async () => {
      (await findNode('#searchbar-draganddrop-submit')).click();
    }, 100);
  }
}

function init() {
  initSearch(search, engine, taskId);
}

init();
