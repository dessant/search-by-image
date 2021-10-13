import {validateUrl} from 'utils/app';
import {findNode, isMobile} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'baidu';

async function search({session, search, image, storageIds}) {
  if (await isMobile()) {
    const data = new FormData();
    data.append('tn', 'pc');
    data.append('from', 'pc');
    data.append('range', '{"page_from": "searchIndex"}');

    if (search.method === 'upload') {
      data.append('image', image.imageBlob, image.imageFilename);
      data.append('image_source', 'PC_UPLOAD_SEARCH_FILE');
    } else {
      data.append('image', image.imageUrl);
      data.append('image_source', 'PC_UPLOAD_SEARCH_URL');
    }

    const rsp = await fetch('https://graph.baidu.com/upload', {
      mode: 'cors',
      method: 'POST',
      body: data
    });

    if (rsp.status !== 200) {
      throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
    }

    const tabUrl = (await rsp.json()).data.url;

    await sendReceipt(storageIds);

    if (validateUrl(tabUrl)) {
      window.location.replace(tabUrl);
    }
  } else {
    (await findNode('.soutu-btn', {timeout: 120000})).click();

    if (search.method === 'upload') {
      const inputSelector = 'input.upload-pic';
      const input = await findNode(inputSelector);

      await setFileInputData(inputSelector, input, image);

      await sendReceipt(storageIds);

      input.dispatchEvent(new Event('change'));
    } else {
      const input = await findNode('input#soutu-url-kw');
      input.value = image.imageUrl;

      await sendReceipt(storageIds);

      (await findNode('.soutu-url-btn')).click();
    }
  }
}

function init() {
  initSearch(search, engine, taskId);
}

init();
