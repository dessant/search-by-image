import {validateUrl} from 'utils/app';
import {findNode, isAndroid} from 'utils/common';
import {dataTransferConstructor} from 'utils/detect';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = '123rf';

async function search({session, search, image, storageIds}) {
  if ((await isAndroid()) || !dataTransferConstructor()) {
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

    const searchData = await rsp.json();

    const tabUrl =
      'https://www.123rf.com/reverse-search/?fid=' + searchData.data.fid;

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
